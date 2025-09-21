from typing import Dict, List, Optional, Tuple, Any, Callable
import os
import json
from dataclasses import dataclass, field, asdict
from enum import Enum

import math
import numpy as np
from sentence_transformers import SentenceTransformer, util

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import asyncio
import requests

import dotenv
dotenv.load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")
base_url = os.getenv("OPENROUTER_MODEL")

kimi_client = ChatOpenAI(
    model="openai/gpt-4o-mini",
    base_url=base_url,
    api_key=api_key,
    temperature=0,
)

# --- UTILS -------------------------------------------------------------------
import re

def clean_response(text: str) -> str:
    """Remove think tags and artifacts."""
    text = re.sub(r"◁think▷.*?◁/think▷", "", text, flags=re.DOTALL)
    text = re.sub(r"◁.*?▷", "", text)
    text = " ".join(text.split())
    return text.strip()



def generate_llm_response(
    prompt: str,
    system_prompt: str = "",
    on_token: Optional[Callable[[str], None]] = None,
) -> str:
    """
    Stream tokens from the model *and* return the final text.
    - If `on_token` is provided, it's called with each incremental delta.
    - Always returns the full concatenated string for internal logic.
    """
    messages = []
    if system_prompt:
        messages.append(SystemMessage(content=system_prompt))

    # Keep your own style/constraints inside the prompt if you want
    user_prompt = (
        f"{prompt}\n\n"
        "Important: Only output your final response. "
        "Do not include any hidden chain of thought. "
        "Keep your response concise (1-2 sentences) and natural."
    )
    messages.append(HumanMessage(content=user_prompt))

    final_chunks: List[str] = []
    try:
        for chunk in kimi_client.stream(messages):  # AIMessageChunk
            delta = chunk.content or ""
            if delta:
                final_chunks.append(delta)
                if on_token:
                    on_token(delta)
        return clean_response("".join(final_chunks))
    except Exception as e:
        err = f"[LLM error] {e}"
        if on_token:
            on_token(err)
        return err


# --- DOMAIN ------------------------------------------------------------------
class AgentType(Enum):
    MENTOR = "mentor"
    MENTEE = "mentee"


from dataclasses import dataclass, field
from typing import List

@dataclass
class Profile:
    # Interpersonal
    hobbies: List[str] = field(default_factory=list)
    life_interests: List[str] = field(default_factory=list)
    mbti: str = ""

    # Professional
    career_interests: List[str] = field(default_factory=list)
    course_descriptions: List[str] = field(default_factory=list)
    job_description: List[str] = field(default_factory=list)

    # Fields referenced by _get_agent_prompt (add safe defaults)
    name: str = ""
    skills: List[str] = field(default_factory=list)
    experience: int = 0
    availability: List[str] = field(default_factory=list)
    communication_style: str = ""
    goals: List[str] = field(default_factory=list)
    interests: List[str] = field(default_factory=list) 
    
    
def json_to_profile(data: Dict[str, Any]) -> Profile:
    """
    Convert JSON data (like the resume/transcript object) into a Profile object.
    Falls back to defaults if fields are missing.
    """

    resume = data.get("resume_data", {})
    contact = resume.get("contact", {})

    # Map some fields
    name = contact.get("name", "")

    # Pull out skills (flatten them)
    skills_dict = resume.get("skills", {})
    skills = []
    for key, vals in skills_dict.items():
        skills.extend(vals)

    # Extract from paragraph_text if present
    paragraph_text = data.get("paragraph_text", "")
    # very simple parsing demo:
    hobbies, life_interests, mbti, career_goals = [], [], "", []
    if "Hobbies and Interests:" in paragraph_text:
        hobbies = [paragraph_text.split("Hobbies and Interests:")[1].split("Personality")[0].strip()]
    if "Personality and MBTI:" in paragraph_text:
        mbti = paragraph_text.split("Personality and MBTI:")[1].split("Career")[0].strip()
    if "Career Goals and Aspirations:" in paragraph_text:
        career_goals = [paragraph_text.split("Career Goals and Aspirations:")[1].strip()]

    return Profile(
        hobbies=hobbies,
        life_interests=life_interests,
        mbti=mbti,
        career_interests=career_goals,
        course_descriptions=[c["title"] for c in data.get("transcript_data", {}).get("courses_completed", [])],
        job_description=[exp["role"] for exp in resume.get("experience", [])],
        name=name,
        skills=skills,
        experience=len(resume.get("experience", [])),  # simple count as proxy
        availability=[],  # Not provided in JSON
        communication_style="",  # Not provided in JSON
        goals=career_goals,
        interests=hobbies + life_interests,
    )


class BaseAgent:
    def __init__(self, agent_id: str, name: str, profile: Profile):
        self.agent_id = agent_id
        self.name = name
        self.profile = profile
        self.preferences: List[str] = []
        self.matched_with: Optional[str] = None
        self.compatibility_scores: Dict[str, float] = {}
        self.negotiation_history: List[Dict[str, Any]] = []

    # --- Main Function ---
    def rate_compatibility(self, other: "BaseAgent", model: "SentenceTransformer") -> float:
        """
        Calculates a final score by blending interpersonal and professional metrics,
        using a single, unified semantic model on raw text.
        """
        if self.agent_type == other.agent_type: return 0.0
        if isinstance(self, Mentor): mentor, mentee = self, other
        else: mentor, mentee = other, self

        # Calculate scores using the simplified helper functions
        interpersonal_score = self._calculate_interpersonal_score(mentor, mentee, model)
        professional_score = self._calculate_professional_score(mentor, mentee, model)

        self.component_scores = {
            "interpersonal_score": interpersonal_score,
            "professional_score": professional_score
        }

        # Apply the final 0.4 / 0.6 weights
        final_score = min(0.4 * interpersonal_score, 1) + min(0.6 * professional_score, 1)
        return final_score

    # --- Helper Functions ---
    
    def _calculate_interpersonal_score(self, mentor: "Mentor", mentee: "Mentee", model: "SentenceTransformer") -> float:
        """Calculates a WEIGHTED interpersonal fit, prioritizing interests (70%) over MBTI (30%)."""
        weights = {"interests": 0.7, "mbti": 0.3}
        mentee_interests = mentee.profile.hobbies + mentee.profile.life_interests
        mentor_interests = mentor.profile.hobbies + mentor.profile.life_interests
        interest_score = self._get_semantic_similarity(mentor_interests, mentee_interests, model)
        mbti_score = self._calculate_mbti_similarity(mentor.profile.mbti, mentee.profile.mbti)
        return min(1,(weights["interests"] * interest_score) + (weights["mbti"] * mbti_score) + 0.2)

    def _calculate_professional_score(self, mentor: "Mentor", mentee: "Mentee", model: "SentenceTransformer") -> float:
        """
        Calculates professional fit based on the semantic similarity of the
        raw, full-text professional profiles.
        """
        # Combine all relevant raw text from the profiles
        mentor_professional_text = mentor.profile.career_interests + mentor.profile.job_description
        mentee_professional_text = mentee.profile.career_interests + mentee.profile.course_descriptions

        # The score is now calculated on the raw text, not keywords
        return min(1, self._get_semantic_similarity(mentor_professional_text, mentee_professional_text, model) + 0.2)

    def _calculate_mbti_similarity(self, mbti1: str, mbti2: str) -> float:
        """Scores MBTI similarity from 0.0 to 1.0 based on shared letters."""
        if not mbti1 or not mbti2 or len(mbti1) != 4 or len(mbti2) != 4:
            return 0.0
        mbti1 = mbti1.upper(); mbti2 = mbti2.upper()
        shared_letters = sum(1 for i in range(4) if mbti1[i] == mbti2[i])
        return shared_letters / 4.0

    def _get_semantic_similarity(self, list1: List[str], list2: List[str], model: "SentenceTransformer") -> float:
        """
        A utility to calculate semantic similarity. It now splits single-paragraph strings
        into sentences for more accurate embedding.
        """
        if not list1 or not list2: return 0.0
        if len(list1) == 1 and '.' in list1[0]: list1 = [s.strip() for s in list1[0].split('.') if s.strip()]
        if len(list2) == 1 and '.' in list2[0]: list2 = [s.strip() for s in list2[0].split('.') if s.strip()]
        vec1 = np.mean(model.encode(list1), axis=0); vec2 = np.mean(model.encode(list2), axis=0)
        return max(0, util.cos_sim(vec1, vec2).item())

    def add_negotiation_history(self, message: str, from_agent: str):
        self.negotiation_history.append(
            {"from": from_agent, "message": message, "round": len(self.negotiation_history) + 1}
        )

class Mentor(BaseAgent):
    def __init__(self, agent_id: str, name: str, profile: Profile, max_mentees: int = 3):
        super().__init__(agent_id, name, profile)
        self.agent_type = AgentType.MENTOR
        self.max_mentees = max_mentees
        self.current_mentees: List[str] = []

class Mentee(BaseAgent):
    def __init__(self, agent_id: str, name: str, profile: Profile):
        super().__init__(agent_id, name, profile)
        self.agent_type = AgentType.MENTEE


# --- MATCHING SYSTEM ---------------------------------------------------------
class MatchingSystem:
    def __init__(self, model: SentenceTransformer, live_stream: bool = True, stream_mode: str = "line"):
        self.mentors: Dict[str, Mentor] = {}
        self.mentees: Dict[str, Mentee] = {}
        self.matches: Dict[str, List[str]] = {}  # mentor_id -> [mentee_ids]
        self.live_stream = live_stream
        self.embedding_model = model
        self.stream_mode = stream_mode

    def add_mentor(self, mentor: Mentor):
        self.mentors[mentor.agent_id] = mentor
        self.matches[mentor.agent_id] = []

    def add_mentee(self, mentee: Mentee):
        self.mentees[mentee.agent_id] = mentee

    def calculate_compatibility_scores(self):
        for mentor in self.mentors.values():
            for mentee in self.mentees.values():
                score = mentor.rate_compatibility(mentee, self.embedding_model)
                mentor.compatibility_scores[mentee.agent_id] = score
                mentee.compatibility_scores[mentor.agent_id] = score

    def find_top_matches_per_mentee(self, top_n: int = 3) -> Dict[str, List[Tuple[str, float]]]:
        self.calculate_compatibility_scores()
        top_matches: Dict[str, List[Tuple[str, float]]] = {}
        for mentee_id in self.mentees.keys():
            potential_mentors: List[Tuple[str, float]] = []
            for mentor_id, mentor in self.mentors.items():
                if len(self.matches[mentor_id]) < mentor.max_mentees:
                    score = mentor.compatibility_scores.get(mentee_id, 0.0)
                    potential_mentors.append((mentor_id, score))
            potential_mentors.sort(key=lambda x: x[1], reverse=True)
            top_matches[mentee_id] = potential_mentors[:top_n]
        return top_matches

    def negotiate_best_match(self, mentee_id: str, potential_mentors: List[Tuple[str, float]]) -> Optional[Tuple[str, float]]:
        if not potential_mentors:
            return None

        print(f"\n\n\033[1m=== NEGOTIATION ROUND FOR {self.mentees[mentee_id].name} ===\033[0m")
        print(f"Potential mentors: {', '.join([self.mentors[m_id].name for m_id, _ in potential_mentors])}")

        successful_mentors: List[Tuple[str, float, List[Dict[str, Any]]]] = []
        for mentor_id, score in potential_mentors:
            mentor = self.mentors[mentor_id]
            mentee = self.mentees[mentee_id]

            print(f"\n\n\033[1mNegotiating with {mentor.name} \033[0m")

            success, conversation = self.negotiate_terms(mentor_id, mentee_id, max_rounds=10)

            # Optional re-print: we've streamed live already; keep the header for clarity
            print("\n\033[94m=== NEGOTIATION (summary) ===\033[0m")
            for msg in conversation:
                if msg["from"] == "system":
                    print(msg["message"])
            if success:
                successful_mentors.append((mentor_id, score, conversation))
                print(f"\n\033[92m✓ Successfully negotiated with {mentor.name}\033[0m")

        if not successful_mentors:
            print("\n\033[91m✗ No successful negotiations with any mentors\033[0m")
            return None

        if len(successful_mentors) == 1:
            mentor_id, score, _ = successful_mentors[0]
            print(f"\n\033[92m✓ MATCHED WITH: {self.mentors[mentor_id].name}\033[0m")
            return mentor_id, score

        print("\n\033[1m=== MULTIPLE SUCCESSFUL NEGOTIATIONS ===\033[0m")
        print("Mentee is deciding between the following mentors:")

        mentor_options: List[Dict[str, Any]] = []
        for m_id, score, conversation in successful_mentors:
            mentor = self.mentors[m_id]
            mentor_options.append(
                {
                    "id": m_id,
                    "name": mentor.name,
                    "profile": asdict(mentor.profile),
                    "initial_compatibility": score,
                    "conversation": conversation,
                }
            )

        mentee = self.mentees[mentee_id]
        decision = self._make_mentee_decision(mentee, mentor_options)
        if decision is not None:
            mentor_id, score = decision
            print(f"\n\033[92m✓ MENTEE CHOSE: {self.mentors[mentor_id].name}\033[0m")
            return mentor_id, score

        print("\n\033[91m✗ Mentee couldn't decide on a mentor\033[0m")
        return None

    def _make_mentee_decision(self, mentee: "Mentee", mentor_options: List[Dict[str, Any]]) -> Optional[Tuple[str, float]]:
        if not mentor_options:
            return None
        if len(mentor_options) == 1:
            return mentor_options[0]["id"], mentor_options[0]["initial_compatibility"]

        prompt = """You are a mentee as a student at Rice Univeresity who has successfully negotiated with multiple potential mentors. 
        You need to choose the best mentor based on your conversations and their profiles based solely about compatability and do not discuss scheduling at all. 
        Be critical for each mentor, and make each mentor pitch why they would be the best mentor for you.

Your profile:
- Experience: {mentee_years} years in {mentee_skills}
- Interests: {mentee_interests}
- Goals: {mentee_goals}
- Communication style: {mentee_style}

Available mentors:
{mentor_descriptions}

Please analyze each mentor's profile and your conversation with them, then make your selection.
Return your response as a JSON object with the following format:
{{
    "decision": "mentor_id",
    "reasoning": "Your detailed reasoning for this choice"
}}
"""
        mentor_descriptions: List[str] = []
        for i, mentor in enumerate(mentor_options, 1):
            mentor_descriptions.append(
                f"""
Mentor {i}: {mentor['name']}
- Skills: {', '.join(mentor['profile']['skills'])}
- Experience: {mentor['profile']['experience']} years
- Communication style: {mentor['profile']['communication_style']}
- Availability: {', '.join(mentor['profile']['availability'])}
- Initial compatibility: {mentor['initial_compatibility']:.1%}
- Conversation summary: {' '.join([msg['message'] for msg in mentor['conversation'][-4:] if msg['from'] != 'system'])}
"""
            )

        formatted_prompt = prompt.format(
            mentee_years=mentee.profile.experience,
            mentee_skills=", ".join(mentee.profile.skills),
            mentee_interests=", ".join(mentee.profile.interests),
            mentee_goals=", ".join(mentee.profile.goals),
            mentee_style=mentee.profile.communication_style,
            mentor_descriptions="\n".join(mentor_descriptions),
        )

        response = generate_llm_response(
            prompt=formatted_prompt,
            system_prompt=(
                "You are a thoughtful mentee making an important decision about which mentor to work with. "
                "Carefully consider each mentor's profile and your conversation with them."
            ),
        )

        try:
            decision_data = json.loads(clean_response(response))
            selected_mentor_id = decision_data.get("decision")
            reasoning = decision_data.get("reasoning", "No reasoning provided")
            for mentor in mentor_options:
                if mentor["id"] == selected_mentor_id:
                    print(f"\n\033[94mMENTEE'S REASONING:\033[0m {reasoning}")
                    return mentor["id"], mentor["initial_compatibility"]
            print(f"\n\033[93mWarning: Invalid mentor ID in decision; defaulting to first option\033[0m")
            return mentor_options[0]["id"], mentor_options[0]["initial_compatibility"]
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"\n\033[93mError parsing decision: {e}. Defaulting to first option.\033[0m")
            return mentor_options[0]["id"], mentor_options[0]["initial_compatibility"]

    def _get_agent_prompt(self, agent_type: AgentType, agent: BaseAgent, other_agent: BaseAgent) -> str:
        profile = agent.profile
        other_profile = other_agent.profile
        if agent_type == AgentType.MENTOR:
            return (
                f"You are {profile.name}, a mentor with {profile.experience} years of experience in {', '.join(profile.skills)}.\n"
                f"You're currently talking to {other_profile.name}, a mentee who is interested in {', '.join(other_profile.interests)}.\n"
                f"Their goals include: {', '.join(other_profile.goals)}\n\n"
                f"Your goals for this mentorship:\n- {'; '.join(profile.goals)}\n\n"
                "Guidelines: Be professional but personable; be specific about what you can offer; suggest concrete next steps; avoid repetition."
                "You are only interested in the previously provided goals." \
                "You should not pretend to be an expert outside of what your profession outlines. For example, if you are an art teacher, you should not be saying that you can help someone with math." \
                "Try to sell yourself as best you can, but do not lie about your capabilities. You only have knowledge about things in your profession."
            )
        else:
            return (
                f"You are {profile.name}, a mentee with {profile.experience} years of experience in {', '.join(profile.skills)}.\n"
                f"Your communication style is {profile.communication_style} and you're available on {', '.join(profile.availability)}.\n\n"
                f"You're talking to {other_profile.name}, a potential mentor with expertise in {', '.join(other_profile.skills)}.\n"
                f"Their goals include: {', '.join(other_profile.goals)}\n\n"
                f"Your goals for this mentorship:\n- {'; '.join(profile.goals)}\n\n"
                "Guidelines: Be clear about what you hope to learn; ask specific questions; discuss fit; propose next steps; avoid repetition."
                "IMPORTANT: You should actively be searching for only the best mentor possible for you. "
                "If you think that the compatability between you and a potential mentor is not very strong, then do NOT be agreeable." \
                "Once you think you think the mentor is good or bad, explicitly state whether you want to work with the mentor or state that you do NOT want to work with the mentor." \
                "Do not just decide on the second turn, as mentors are trying their hardest to sell themselves as the best mentor. Take at least a few turns questioning the mentor"
            )

    def _stream_prefix_printer(self, label: str):
        # token-mode only; for "line" we won't use this
        started = {"v": False}
        def cb(delta: str):
            if not self.live_stream: 
                return
            if not started["v"]:
                print(f"{label.capitalize()}: ", end="", flush=True)
                started["v"] = True
            print(delta, end="", flush=True)
        return cb

    def _say(self, who: str, text: str):
        """Always print one clean line for the speaker."""
        text = " ".join(text.split())  # squash odd whitespace from model
        print(f"{who}: {text}", flush=True)

    def _get_negotiation_context(self, mentor: Mentor, mentee: Mentee, conversation_history: List[Dict[str, Any]]):
        # Not used directly below, but available if you want to give more context.
        return (
            "Current conversation history:\n" +
            "\n".join(f"{m['from']}: {m['message']}" for m in conversation_history)
        )

    def negotiate_terms(self, mentor_id: str, mentee_id: str, max_rounds: int = 3):
        mentor = self.mentors[mentor_id]
        mentee = self.mentees[mentee_id]

        mentor_system = self._get_agent_prompt(AgentType.MENTOR, mentor, mentee)
        mentee_system = self._get_agent_prompt(AgentType.MENTEE, mentee, mentor)

        convo = []
        current = mentor
        current_sys = mentor_system
        other = mentee

        for turn_idx in range(max_rounds * 2):
            if not convo:
                prompt = (
                    "Start the mentorship conversation.\n"
                    "- Briefly introduce yourself (1 sentence)\n"
                    "- Mention 1–2 specific ways you can help\n"
                    "- Propose why you would be the BEST mentor. However, DO NOT lie about your background. STRICTLY adhere to your specific profile."
                    "- Do not talk about scheduling/meeting times, only compatability"
                )
            else:
                last_3 = "\n".join([m["message"] for m in convo[-3:]])
                prompt = (
                    f"Continue the conversation considering:\n{last_3}\n\n"
                    "Guidelines:\n"
                    "1) Acknowledge specifically\n"
                    "2) Discuss compatability as a mentor/mentee only, nothing else\n"
                    "3) <= 3 sentences\n"
                    "4) Avoid repetition"
                    "5) Do not talk about scheduling/meeting times, only compatability"
                )

            # ---- the important change: only token-stream when requested ----
            if self.stream_mode == "token":
                on_token = self._stream_prefix_printer(
                    "Mentor" if current is mentor else "Mentee"
                )
                text = generate_llm_response(prompt=prompt, system_prompt=current_sys, on_token=on_token)
                if self.live_stream:
                    print()  # newline after token stream
            else:
                text = generate_llm_response(prompt=prompt, system_prompt=current_sys)
                if self.live_stream:
                    self._say("Mentor" if current is mentor else "Mentee", text)

            msg = {
                "from": "mentor" if current is mentor else "mentee",
                "message": text,
                "round": (turn_idx // 2) + 1,
            }
            convo.append(msg)
            current.add_negotiation_history(text, msg["from"])
            other.add_negotiation_history(text, msg["from"])

            # decision checks after each pair (mentee just spoke)
            # decision checks after each pair (mentee just spoke)
            if turn_idx >= 6:
                # Use LLM to check for agreement
                recent_convo = " ".join(m["message"] for m in convo[-4:])
                
                agreement_prompt = f"""Based on this conversation between a mentor and mentee, does the mentee explicitly say that they want to work or do not want to work with the mentor? Answer only 'YES' or 'NO'.

            Recent conversation:
            {recent_convo}"""
                
                response = generate_llm_response(agreement_prompt).strip().upper()
                
                if response.startswith("YES") or turn_idx >= 6:
                    print("\n=== NEGOTIATION (summary) ===")
                    print("✅ Negotiation successful!\n")
                    return True, convo
                
                # Check for explicit rejection
                if any(phrase in recent_convo.lower() for phrase in ["not interested", "i decline", "won't work"]):
                    print("\n=== NEGOTIATION (summary) ===")
                    print("❌ Negotiation unsuccessful. The parties could not reach an agreement.\n")
                    return False, convo
                
            current, other = other, current
            current_sys = mentee_system if current is mentee else mentor_system

# --- DRIVER ------------------------------------------------------------------


PROFILE_FIELDS = [
    "hobbies",
    "life_interests",
    "mbti",
    "career_interests",
    "course_descriptions",
    "job_description",
    "name",
    "skills",
    "experience",
    "availability",
    "communication_style",
    "goals",
    "interests",
]

def init_MAN():

    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    # pass the model in
    matching_system = MatchingSystem(model=embedding_model, live_stream=True, stream_mode="line")


    results: Dict[str, Any] = {
        "successful_matches": [],
        "failed_negotiations": 0,
        "mentor_assignments": {},
    }

    # --- Define agents (use the expanded Profile fields) ---
    # mentor_A = Mentor(
    #     "mentor_A", "Dr. Sharma",
    #     Profile(
    #         name="Dr. Sharma",
    #         hobbies=["Reading sci-fi", "Building custom keyboards"],
    #         life_interests=["The future of AI ethics"],
    #         mbti="INTJ",
    #         skills=["Python", "TensorFlow", "Transformers"],
    #         experience=12,
    #         availability=["Mon 2-4pm", "Thu 1-3pm"],
    #         communication_style="direct",
    #         goals=["Mentor next-gen AI talent", "Publish research"],
    #         career_interests=["Mentoring AI talent; continuing research in cutting-edge AI."],
    #         job_description=["Lead AI Scientist at Google Brain. Developing/training LLMs; tokenization, embeddings, transformers; Python + TensorFlow."]
    #     ),
    #     max_mentees=2
    # )

    # mentor_B = Mentor(
    #     "mentor_B", "Prof. Vance",
    #     Profile(
    #         name="Prof. Vance",
    #         hobbies=["Visiting museums", "Classical music"],
    #         life_interests=["Renaissance art history"],
    #         mbti="ESFJ",
    #         skills=["Research", "Writing"],
    #         experience=15,
    #         availability=["Tue 10-12", "Fri 9-11"],
    #         communication_style="supportive",
    #         goals=["Publish papers", "Achieve tenure"],
    #         career_interests=["Publishing academic papers; tenure track"],
    #         job_description=["Professor of History. 19th Century European culture; archival research."]
    #     ),
    #     max_mentees=3
    # )

    # mentee_A = Mentee(
    #     "mentee_A", "Ben Carter",
    #     Profile(
    #         name="Ben Carter",
    #         hobbies=["Building chatbots", "Strategy games"],
    #         life_interests=["Sci-fi novels about AI"],
    #         mbti="INTP",
    #         skills=["Python", "Basics of ML"],
    #         experience=2,
    #         availability=["Mon 1-5pm", "Wed 3-6pm"],
    #         communication_style="direct",
    #         goals=["Become AI engineer working on LLMs", "Publish a paper"],
    #         interests=["AI", "NLP"],
    #         career_interests=["Become an AI engineer working on LLMs at a top tech company."],
    #         course_descriptions=["Intro to AI; Advanced Algorithms; NLP (tokenization, embeddings, transformer architectures)."]
    #     )
    # )

    mentee = requests.get('http://localhost:8000/users/newest', timeout=3).json()

    matching_system.add_mentee(Mentee(agent_id="mentee", name=mentee.get("resume_data", "").get("contact", "").get("name", ""), profile=json_to_profile(mentee)))

    # --- Add agents to the system (this was missing) ---
    mentors = requests.get("http://localhost:8000/mentors", timeout=3).json()
    # print(mentors)

    for mentor in mentors:
        profile_data = {field: mentor.get(field) for field in PROFILE_FIELDS}

        matching_system.add_mentor(
            Mentor(
                agent_id=mentor["id"],
                name=mentor.get("name", ""),
                profile=Profile(**profile_data)
            )
        )
            
    # matching_system.add_mentor(mentor_A)
    # matching_system.add_mentor(mentor_B)
    # matching_system.add_mentee(mentee_A)
    
    # test_cases = {
    #     "A: Excellent Match": (mentor_A, mentee_A),
    #     "B: Mismatched": (mentor_B, mentee_A),
    # }
    

    top_matches = matching_system.find_top_matches_per_mentee(top_n=2)
    for mentee_id, mentors in top_matches.items():
        print(f"\n\n\033[1m=== PROCESSING MENTEE: {matching_system.mentees[mentee_id].name} ===\033[0m")
        print(f"Top {len(mentors)} potential mentors found")

        match_result = matching_system.negotiate_best_match(mentee_id, mentors)
        if match_result:
            mentor_id, score = match_result
            mentor = matching_system.mentors[mentor_id]
            mentee = matching_system.mentees[mentee_id]

            matching_system.matches[mentor_id].append(mentee_id)
            mentor.current_mentees.append(mentee_id)
            mentee.matched_with = mentor_id

            results["successful_matches"].append(
                {
                    "mentee_id": mentee_id,
                    "mentee_name": mentee.name,
                    "mentor_id": mentor_id,
                    "mentor_name": mentor.name,
                    "compatibility_score": score,
                }
            )
            results.setdefault("mentor_assignments", {}).setdefault(mentor_id, []).append(mentee_id)
            print(f"\n\033[92m✓ SUCCESSFUL MATCH: {mentee.name} matched with {mentor.name} (Score: {score:.1%})\033[0m")
        else:
            results["failed_negotiations"] += 1
            print(f"\n\033[91m✗ No suitable mentor found for {matching_system.mentees[mentee_id].name}\033[0m")

    print("\n\n\033[1m=== FINAL MATCHING SUMMARY ===\033[0m")
    print("\n\033[1mMENTEE MATCHES:\033[0m")

    matched_mentor = None
    lowest_mentor_score = float("inf")
    lowest_mentor = None
    for mentee_id, mentee in matching_system.mentees.items():
        if mentee.matched_with:
            mentor = matching_system.mentors[mentee.matched_with]
            score = mentor.compatibility_scores.get(mentee_id, 0)
            print(f"  ✓ {mentee.name} → {mentor.name}")
            matched_mentor = mentor
            if score < lowest_mentor_score:
                lowest_mentor_score = score
                lowest_mentor = mentor

    unmatched = [m for m in matching_system.mentees.values() if not m.matched_with]
    if unmatched:
        print("\n\033[91mUNMATCHED MENTEES:\033[0m")
        for m in unmatched:
            print(f"  ✗ {m.name} (No suitable match found)")

    # print("\n\033[1mMENTOR CAPACITY:\033[0m")
    # for mentor in matching_system.mentors.values():
    #     max_mentees = mentor.max_mentees
    #     current_mentees = len(mentor.current_mentees)
    #     status = "\033[92m" if current_mentees > 0 else "\033[93m"
    #     mentee_names = ", ".join(
    #         [m.name for m in matching_system.mentees.values() if m.matched_with == mentor.agent_id]
    #     ) or "None"
    #     print(f"  {mentor.name}: {current_mentees}/{max_mentees} mentees {status}({mentee_names})\033[0m")


    score_a = matched_mentor.rate_compatibility(mentee, embedding_model)
    inter_a  = matched_mentor.component_scores.get("interpersonal_score", 0.0)
    prof_a   = matched_mentor.component_scores.get("professional_score", 0.0)

    # Compute B once
    score_b = lowest_mentor.rate_compatibility(mentee, embedding_model)
    inter_b  = lowest_mentor.component_scores.get("interpersonal_score", 0.0)
    prof_b   = lowest_mentor.component_scores.get("professional_score", 0.0)

    print("\n=== BENCHMARK RESULTS ===")
    print_test_case_block("Test Case A • Excellent Match", inter_a, prof_a, score_a)
    print("\n")
    print_test_case_block("Test Case B • Mismatched",      inter_b, prof_b, score_b)


# ── Pretty printing helpers ───────────────────────────────────────────────────
def _bar(value: float, width: int = 24) -> str:
    """ASCII meter: value in [0,1] -> █/░ bar."""
    value = max(0.0, min(1.0, value))
    filled = int(round(value * width))
    return "█" * filled + "░" * (width - filled)

def _pct(v: float) -> str:
    return f"{int(round(v*100)):>3d}%"

def print_test_case_block(name: str, interpersonal: float, professional: float, final_score: float):
    print(
        "\n".join([
            f"",
            f"┌───────────────────────────────┐",
            f"│   {name:<27} │",
            f"├───────────────┬─────┬─────────┤",
            f"│ Interpersonal │ {_pct(interpersonal):>4} │ {_bar(interpersonal)} │",
            f"│ Professional  │ {_pct(professional):>4} │ {_bar(professional)} │",
            f"├───────────────┴─────┴─────────┤",
            f"│ FINAL SCORE   │ {_pct(final_score):>4} │ {_bar(final_score)} │",
            f"└───────────────────────────────┘",
            f""
        ])
    )
    print("\n")