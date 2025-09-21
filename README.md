# OwlConnect

*Breaking down academic silos through intelligent mentorship matching*

## Inspiration

In our teammate's second semester at Rice, he faced a major decision: whether he should stay a CS major or if he should switch to pre-med? This choice could alter his entire future, so he tried to find advice from mentors who had walked that path. But here's the problem - as a CS major, our teammate's entire network was software engineers. He had no way to connect with mentors in the medical fields that were Rice alumni. Our teammate needed someone with a similar experience to listen to his thoughts and respond with effective advice.

This is the reality for thousands of Rice students. We're all trapped in our academic silos, missing out on transformative guidance that could reshape our careers simply because we don't know how to find the right mentors. Mentorship matching is often random and ineffective, and students frequently miss out on valuable guidance from professors, PhDs, and upperclassmen who could transform their academic journey. Seeing this widespread problem, we started working on OwlConnect.

## What it does

OwlConnect solves the broken mentorship discovery process at Rice University. Students like our teammate, who wanted to explore pre-med but only knew CS professionals, now have access to intelligent mentor matching that breaks down academic silos.

Our platform:
- Uses multi-agent negotiation to match students with professors, PhDs, and upperclassmen who understand their unique career transitions
- Considers contextual factors that simple similarity algorithms miss, like finding mentors who made similar career pivots even if their profiles look different on paper
- Shows students their potential futures through interactive career path visualizations that map real career trajectories
- Eliminates the guesswork in mentorship by providing transparent reasoning for why each mentor was selected
- Optimizes mentor availability across the university to ensure quality connections for everyone

## How we built it

We built a two-stage intelligent matching system that combines speed with sophistication. Our FastAPI backend uses MongoDB vector embeddings with All-miniLM-L6-v2 sentence transformers to rapidly identify the top 5 mentor candidates based on academic and professional compatibility. We leveraged MCP (Model Context Protocol) to fetch course descriptions and compare them to mentor job descriptions, enabling deeper compatibility analysis between student academic backgrounds and mentor professional experiences. Then, our custom multi-agent system built with LangChain takes over. Mentee agents and mentor agents engage in intelligent reasoning to consider distinct experiences, career pivots, and contextual factors that embeddings cannot capture.

For example, while vector similarity might miss that a CS student and a mentor with a biology background are compatible, our agents can reason: "This mentee wants to switch to pre-med, and this mentor made that exact transition, even though their keyword profiles don't align."

The Next.js frontend with TypeScript and Tailwind CSS displays this negotiation process in real-time using WebSocket connections, showing students exactly why each match was selected. Our interactive career path branching visualization maps mentor expertise to concrete career trajectories across track, domain, and location dimensions, using actual career data from our mentor network. Students input their resume, transcript, and career aspirations through our OpenRouter API integration, then receive their top 3 mentor matches with visual predictions of potential career outcomes. We used Python for our multi-agent orchestration and NumPy for efficient vector operations, with threading ensuring smooth real-time performance.

## Challenges we ran into

Building a multi-agent negotiation system that could reason about human experiences proved more complex than traditional matching algorithms. We struggled with teaching our agents to weigh different factors appropriately. Should shared research interests outweigh career transition experience? How do we balance a student's preferences with mentor availability? Creating consensus between competing agent priorities while maintaining fast response times required extensive experimentation with our negotiation protocols and decision-making frameworks.

## Accomplishments that we're proud of

We've created the first mentorship platform that truly understands context. Our multi-agent negotiation engine doesn't just match keywords. It reasons through complex career scenarios and finds mentors who can guide students through specific transitions they've personally navigated. The real-time negotiation visualization makes our AI's decision-making transparent, so students understand not just who their mentors are, but why they're perfect matches. Most importantly, we've built a system that can connect students to mentorship opportunities they never would have discovered on their own, breaking down the academic silos that limit so many career explorations.

## What we learned

Developing multi-agent systems taught us that AI reasoning is fundamentally different from traditional algorithms. Our agents had to learn to "think" about human experiences rather than just calculate similarities. We gained deep expertise in agent-to-agent negotiation, consensus formation, and contextual AI reasoning. Beyond the technical challenges, working under intense hackathon pressure taught us to prioritize features that create real user value over impressive-sounding technology. We learned that the best AI systems are those that augment human decision-making rather than replacing it.

## What's next for OwlConnect

Rice's close-knit community provides rich mentorship opportunities, but most universities lack this personalized support structure. We want to expand OwlConnect to large public universities where students often feel lost in the system. Our multi-agent approach becomes even more valuable at scale. Imagine helping thousands of students at UT Austin or UC Berkeley discover mentors across different schools and departments who can guide their career transitions. We also plan to incorporate alumni networks, industry professionals, and cross-university mentorship to create a truly comprehensive career guidance ecosystem.