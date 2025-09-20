from typing import Dict, List, Optional, Tuple, Any, Callable
import os
import json
from dataclasses import dataclass, field, asdict
from enum import Enum

import math
import numpy as np
from sentence_transformers import SentenceTransformer, util
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

import dotenv
dotenv.load_dotenv()

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


@dataclass
class Profile:
    # Interpersonal Data
    hobbies: List[str] = field(default_factory=list)
    life_interests: List[str] = field(default_factory=list)
    mbti: str = ""

    # Professional Data
    career_interests: List[str] = field(default_factory=list)
    course_descriptions: List[str] = field(default_factory=list)
    job_description: List[str] = field(default_factory=list)


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
        final_score = min(0.4 * (interpersonal_score + 0.2), 1) + min(0.6 * (professional_score + 0.2), 1)
        return final_score

    # --- Helper Functions ---
    
    def _calculate_interpersonal_score(self, mentor: "Mentor", mentee: "Mentee", model: "SentenceTransformer") -> float:
        """Calculates a WEIGHTED interpersonal fit, prioritizing interests (70%) over MBTI (30%)."""
        weights = {"interests": 0.7, "mbti": 0.3}
        mentee_interests = mentee.profile.hobbies + mentee.profile.life_interests
        mentor_interests = mentor.profile.hobbies + mentor.profile.life_interests
        interest_score = self._get_semantic_similarity(mentor_interests, mentee_interests, model)
        mbti_score = self._calculate_mbti_similarity(mentor.profile.mbti, mentee.profile.mbti)
        return (weights["interests"] * interest_score) + (weights["mbti"] * mbti_score)

    def _calculate_professional_score(self, mentor: "Mentor", mentee: "Mentee", model: "SentenceTransformer") -> float:
        """
        Calculates professional fit based on the semantic similarity of the
        raw, full-text professional profiles.
        """
        # Combine all relevant raw text from the profiles
        mentor_professional_text = mentor.profile.career_interests + mentor.profile.job_description
        mentee_professional_text = mentee.profile.career_interests + mentee.profile.course_descriptions

        # The score is now calculated on the raw text, not keywords
        return self._get_semantic_similarity(mentor_professional_text, mentee_professional_text, model)

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
    def __init__(self, agent_id, name, profile): self.agent_id=agent_id; self.name=name; self.profile=profile; self.agent_type="mentor"
class Mentee(BaseAgent):
    def __init__(self, agent_id, name, profile): self.agent_id=agent_id; self.name=name; self.profile=profile; self.agent_type="mentee"

###class Mentor(BaseAgent):
    def __init__(self, agent_id: str, name: str, profile: Profile, max_mentees: int = 3):
        super().__init__(agent_id, name, profile)
        self.agent_type = AgentType.MENTOR
        self.max_mentees = max_mentees
        self.current_mentees: List[str] = []


###class Mentee(BaseAgent):
    def __init__(self, agent_id: str, name: str, profile: Profile):
        super().__init__(agent_id, name, profile)
        self.agent_type = AgentType.MENTEE


# --- MATCHING SYSTEM ---------------------------------------------------------
class MatchingSystem:
    def __init__(self, live_stream: bool = True):
        self.mentors: Dict[str, Mentor] = {}
        self.mentees: Dict[str, Mentee] = {}
        self.matches: Dict[str, List[str]] = {}  # mentor_id -> [mentee_ids]
        self.live_stream = live_stream

    def add_mentor(self, mentor: Mentor):
        self.mentors[mentor.agent_id] = mentor
        self.matches[mentor.agent_id] = []

    def add_mentee(self, mentee: Mentee):
        self.mentees[mentee.agent_id] = mentee

    def calculate_compatibility_scores(self):
        for mentor in self.mentors.values():
            for mentee in self.mentees.values():
                score = mentor.rate_compatibility(mentee)
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

            print(f"\n\n\033[1mNegotiating with {mentor.name} (Compatibility: {score:.1%})\033[0m")

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

        prompt = """You are a mentee who has successfully negotiated with multiple potential mentors. 
You need to choose the best mentor based on your conversations and their profiles.

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
                f"Your communication style is {profile.communication_style} and you're available on {', '.join(profile.availability)}.\n\n"
                f"You're currently talking to {other_profile.name}, a mentee who is interested in {', '.join(other_profile.interests)}.\n"
                f"Their goals include: {', '.join(other_profile.goals)}\n\n"
                f"Your goals for this mentorship:\n- {'; '.join(profile.goals)}\n\n"
                "Guidelines: Be professional but personable; be specific about what you can offer; suggest concrete next steps; avoid repetition."
            )
        else:
            return (
                f"You are {profile.name}, a mentee with {profile.experience} years of experience in {', '.join(profile.skills)}.\n"
                f"Your communication style is {profile.communication_style} and you're available on {', '.join(profile.availability)}.\n\n"
                f"You're talking to {other_profile.name}, a potential mentor with expertise in {', '.join(other_profile.skills)}.\n"
                f"Their goals include: {', '.join(other_profile.goals)}\n\n"
                f"Your goals for this mentorship:\n- {'; '.join(profile.goals)}\n\n"
                "Guidelines: Be clear about what you hope to learn; ask specific questions; discuss fit; propose next steps; avoid repetition."
            )

    def _stream_prefix_printer(self, label: str) -> Callable[[str], None]:
        color = "\033[92m" if label.lower() == "mentor" else "\033[96m"
        started = {"v": False}

        def cb(delta: str):
            if not self.live_stream:
                return
            if not started["v"]:
                print(f"{color}{label.capitalize()}:\033[0m ", end="", flush=True)
                started["v"] = True
            print(delta, end="", flush=True)
        return cb

    def _get_negotiation_context(self, mentor: Mentor, mentee: Mentee, conversation_history: List[Dict[str, Any]]):
        # Not used directly below, but available if you want to give more context.
        return (
            "Current conversation history:\n" +
            "\n".join(f"{m['from']}: {m['message']}" for m in conversation_history)
        )

    def negotiate_terms(self, mentor_id: str, mentee_id: str, max_rounds: int = 3) -> Tuple[bool, List[Dict[str, Any]]]:
        mentor = self.mentors[mentor_id]
        mentee = self.mentees[mentee_id]

        mentor_system = self._get_agent_prompt(AgentType.MENTOR, mentor, mentee)
        mentee_system = self._get_agent_prompt(AgentType.MENTEE, mentee, mentor)

        conversation_history: List[Dict[str, Any]] = []
        current_speaker: BaseAgent = mentor
        current_system = mentor_system
        other_agent: BaseAgent = mentee

        for turn_idx in range(max_rounds * 2):  # mentor, mentee, mentor, mentee, ...
            if not conversation_history:
                prompt = (
                    "Start the mentorship conversation.\n"
                    "- Briefly introduce yourself (1 sentence)\n"
                    "- Mention 1-2 specific ways you can help based on their profile\n"
                    "- Propose a clear next step (e.g., 'Let's schedule our first meeting')"
                )
            else:
                last_3 = "\n".join([msg["message"] for msg in conversation_history[-3:]])
                prompt = (
                    f"Continue the conversation naturally, considering the recent messages:\n{last_3}\n\n"
                    "Guidelines:\n"
                    "1. Acknowledge their last message specifically\n"
                    "2. If points repeat, move to a concrete plan\n"
                    "3. If you're ready to agree, state it and suggest next steps\n"
                    "4. If you need info, ask specific questions\n"
                    "5. Keep under 3 sentences\n"
                    "6. Avoid repetition\n"
                )

            # live token streaming printer for this speaker
            on_token = self._stream_prefix_printer("mentor" if current_speaker is mentor else "mentee")
            response_text = generate_llm_response(prompt=prompt, system_prompt=current_system, on_token=on_token)
            if self.live_stream:
                print()  # newline after this speaker's streamed turn

            message = {
                "from": "mentor" if current_speaker is mentor else "mentee",
                "message": response_text,
                "round": (turn_idx // 2) + 1,
            }
            conversation_history.append(message)
            current_speaker.add_negotiation_history(response_text, message["from"])
            other_agent.add_negotiation_history(response_text, message["from"])

            # Check for agreement after each PAIR of turns -> when mentee has just spoken
            if turn_idx % 2 == 1:  # after mentee's turn
                last_two = conversation_history[-2:]
                last_exchange = " ".join([msg["message"].lower() for msg in last_two])

                agreement_phrases = [
                    "agree", "accept", "sounds good", "deal", "let's do it",
                    "great", "perfect", "i accept", "i agree", "confirmed", "definitely",
                    "let's proceed", "i'm in", "count me in", "sounds good to me",
                    "i accept your terms", "i agree to your terms", "i'd love to",
                    "i'm excited to start", "looking forward to it", "let's get started",
                ]
                rejection_phrases = [
                    "no thanks", "i don't think so", "not interested", "i decline",
                    "i don't agree", "i can't accept", "this won't work", "not a good fit",
                    "not what i'm looking for", "i'll pass", "not for me", "not now",
                    "maybe later", "i have to decline",
                ]

                positives = sum(1 for p in agreement_phrases if p in last_exchange)
                negatives = sum(1 for p in rejection_phrases if p in last_exchange)

                if positives > negatives and positives > 0:
                    conversation_history.append({
                        "from": "system",
                        "message": "✅ Negotiation successful! Both parties have reached an agreement.",
                        "round": (turn_idx // 2) + 1,
                    })
                    return True, conversation_history
                if negatives > 0:
                    conversation_history.append({
                        "from": "system",
                        "message": "❌ Negotiation unsuccessful. The parties could not reach an agreement.",
                        "round": (turn_idx // 2) + 1,
                    })
                    return False, conversation_history

                # If we've just finished the last pair of turns
                if turn_idx == (max_rounds * 2) - 1:
                    conversation_history.append({
                        "from": "system",
                        "message": "ℹ️  Maximum negotiation rounds reached. No clear agreement was made.",
                        "round": (turn_idx // 2) + 1,
                    })
                    return False, conversation_history

            # Switch speakers
            current_speaker, other_agent = other_agent, current_speaker
            current_system = mentee_system if current_speaker is mentee else mentor_system

        return False, conversation_history


# --- SAMPLE DATA -------------------------------------------------------------

def create_sample_mentors() -> List[Mentor]:
    return [
        Mentor(
            "m1",
            "Dr. Smith",
            Profile(
                name="Dr. Smith",
                skills=["AI", "Machine Learning", "Python", "Research"],
                interests=["Mentoring", "New Technologies", "Neuroscience"],
                experience=10,
                availability=["Monday 2-4pm", "Wednesday 3-5pm", "Friday 10am-12pm"],
                communication_style="direct",
                goals=["Publish research", "Mentor students"],
            ),
            max_mentees=2,
        ),
        Mentor(
            "m2",
            "Prof. Johnson",
            Profile(
                name="Prof. Johnson",
                skills=["Data Science", "Statistics", "R", "Python"],
                interests=["Teaching", "Open Source"],
                experience=8,
                availability=["Tuesday 1-3pm", "Thursday 2-4pm"],
                communication_style="supportive",
                goals=["Improve teaching methods", "Collaborate on projects"],
            ),
            max_mentees=3,
        ),
    ]


def create_sample_mentees() -> List[Mentee]:
    return [
        Mentee(
            "s1",
            "Alex",
            Profile(
                name="Alex",
                skills=["Python", "Basic ML"],
                interests=["AI", "Machine Learning", "Research"],
                experience=2,
                availability=["Monday 1-5pm", "Wednesday 3-6pm"],
                communication_style="direct",
                goals=["Learn advanced ML", "Publish a paper"],
            ),
        ),
        Mentee(
            "s2",
            "Taylor",
            Profile(
                name="Taylor",
                skills=["R", "Statistics"],
                interests=["Data Science", "Open Source"],
                experience=1,
                availability=["Tuesday 12-4pm", "Thursday 1-5pm"],
                communication_style="supportive",
                goals=["Improve coding skills", "Contribute to open source"],
            ),
        ),
        Mentee(
            "s3",
            "Jordan",
            Profile(
                name="Jordan",
                skills=["Python", "Data Analysis"],
                interests=["AI", "Neuroscience", "Research"],
                experience=3,
                availability=["Monday 10am-12pm", "Friday 2-4pm"],
                communication_style="direct",
                goals=["Publish research", "Learn about AI applications"],
            ),
        ),
    ]


# --- DRIVER ------------------------------------------------------------------

def main(model):
    """
    Test runner for the simplified, single-model, raw-text compatibility logic.
    """
    print("\n\033[1m=== RUNNING COMPATIBILITY TESTS (Unified Raw Text Model) ===\033[0m")

    # --- Test Case Data (Realistic Paragraphs) ---
    mentor_A = Mentor("mentor_A", "Dr. Sharma", Profile(
        hobbies=["Reading sci-fi", "Building custom keyboards"], life_interests=["The future of AI ethics"], mbti="INTJ",
        career_interests=["I am passionate about mentoring the next generation of AI talent and continuing my own research in cutting-edge AI."],
        job_description=["As the Lead AI Scientist at Google Brain, my role focuses on developing and training large language models. We use these for real-world applications, working primarily with Python and TensorFlow. I work extensively with tokenization, embeddings, and transformeres."]
    ))
    mentee_A = Mentee("mentee_A", "Ben Carter", Profile(
        hobbies=["Building chatbots", "Playing strategy games"], life_interests=["I love reading science fiction novels, especially those about AI."], mbti="INTP",
        career_interests=["My primary goal is to become an AI engineer at a top tech company where I can work on large language models."],
        course_descriptions=["My coursework includes 'Intro to AI' and 'Advanced Algorithms'. A key course was 'Natural Language Processing,' which covered topics like tokenization, vector embeddings, and transformer architectures."]
    ))
    mentor_B = Mentor("mentor_B", "Prof. Vance", Profile(
        hobbies=["Visiting museums", "Classical music"], life_interests=["My focus is on Renaissance art history."], mbti="ESFJ",
        career_interests=["My career is dedicated to publishing academic papers and achieving tenure as a university professor."],
        job_description=["I am a Professor of History at a major university. My work involves specializing in 19th Century European cultural movements and conducting extensive archival research."]
    ))
    
    test_cases = {
        "A: Excellent Match": (mentor_A, mentee_A),
        "B: Mismatched": (mentor_B, mentee_A),
    }

    for name, (mentor, mentee) in test_cases.items():
        print(f"\n\033[1m--- Test Case {name} ---\033[0m")
        
        score = mentor.rate_compatibility(mentee, model)
        
        interpersonal = mentor.component_scores.get("interpersonal_score", 0)
        professional = mentor.component_scores.get("professional_score", 0)

        print(f"  Interpersonal Score (40%): {interpersonal:.2f}")
        print(f"  Professional Score  (60%): {professional:.2f}")
        print("---------------------------------")
        print(f"  \033[92mFinal Weighted Score: {score:.2f}\033[0m")

# --- Script Entry Point ---
if __name__ == "__main__":
    print("Loading unified embedding model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Model loaded.")
    
    main(embedding_model)
