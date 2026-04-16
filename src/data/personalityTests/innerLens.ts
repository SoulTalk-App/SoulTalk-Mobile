/**
 * Inner Lens personality test.
 * Content transcribed verbatim from:
 *   /Users/vidishraj/Desktop/SoulTalk/Personality Test Inner Lens.docx
 */
import { TestDefinition } from './types';

export const innerLens: TestDefinition = {
  id: 'inner_lens',
  version: 'v1',
  title: 'Inner Lens',
  tagline: 'Discover the filter through which you see the world.',
  about:
    "Inner Lens explores the unique \u201Cfilter\u201D through which you interpret the world. It\u2019s shaped by your values, past experiences, emotional wiring, and mental patterns. This lens influences how you perceive challenges, opportunities, relationships, and even yourself. Understanding it gives you the power to spot biases, deepen self-awareness, and make more conscious choices in work, love, and daily life.\n\n" +
    "The world isn't just what happens to us\u2014it's how we see it. Your Inner Lens is the unique filter, built from your experiences and wiring, that shapes your every perception. It determines whether you see a risk or an opportunity, a detail or a pattern, the past or the future.\n\n" +
    "Discover your dominant lens to understand why you react the way you do, how you connect with others, and how to make your perspective your greatest asset.\n\n" +
    "How it works: 25 statements. Rate each on a scale of 1 (Strongly Disagree) to 5 (Strongly Agree). Answer intuitively and honestly\u2014there are no right or wrong answers.",
  locked: false,
  categories: ['Visionary', 'Reflective', 'Cautious', 'Analytical'],
  questions: [
    { id: 'q1', text: 'I tend to see the big picture before focusing on the details.', category: 'Visionary' },
    { id: 'q2', text: 'I often replay conversations in my head to understand them better.', category: 'Reflective' },
    { id: 'q3', text: 'I naturally focus on what could go wrong in a situation.', category: 'Cautious' },
    { id: 'q4', text: 'I quickly notice patterns in people\u2019s behavior.', category: 'Analytical' },
    { id: 'q5', text: 'I try to find meaning in events, even small ones.', category: 'Reflective' },
    { id: 'q6', text: 'I look for possibilities and potential in most situations.', category: 'Visionary' },
    { id: 'q7', text: 'I\u2019m highly aware of how my actions affect others.', category: 'Reflective' },
    { id: 'q8', text: 'I focus on avoiding risks before taking action.', category: 'Cautious' },
    { id: 'q9', text: 'I tend to analyze problems by breaking them into smaller parts.', category: 'Analytical' },
    { id: 'q10', text: 'I\u2019m motivated by long-term goals more than short-term wins.', category: 'Visionary' },
    { id: 'q11', text: 'I reflect deeply before making major life changes.', category: 'Reflective' },
    { id: 'q12', text: 'I\u2019m good at identifying potential challenges early.', category: 'Cautious' },
    { id: 'q13', text: 'I enjoy solving puzzles or strategy-based challenges.', category: 'Analytical' },
    { id: 'q14', text: 'I often think about how my future self will be affected by present choices.', category: 'Visionary' },
    { id: 'q15', text: 'I replay past mistakes to learn from them.', category: 'Reflective' },
    { id: 'q16', text: 'I prefer to have contingency plans in case things go wrong.', category: 'Cautious' },
    { id: 'q17', text: 'I enjoy analyzing data, trends, or measurable results.', category: 'Analytical' },
    { id: 'q18', text: 'I often imagine ideal outcomes in detail.', category: 'Visionary' },
    { id: 'q19', text: 'I take time to process my emotions before reacting.', category: 'Reflective' },
    { id: 'q20', text: 'I\u2019m careful to avoid making impulsive decisions.', category: 'Cautious' },
    { id: 'q21', text: 'I enjoy finding logical solutions to complex problems.', category: 'Analytical' },
    { id: 'q22', text: 'I can visualize how current events might shape the future.', category: 'Visionary' },
    { id: 'q23', text: 'I regularly journal, meditate, or reflect on my day.', category: 'Reflective' },
    { id: 'q24', text: 'I take steps to avoid unnecessary risks in relationships or work.', category: 'Cautious' },
    { id: 'q25', text: 'I\u2019m curious about how systems and processes work.', category: 'Analytical' },
  ],
  results: {
    Visionary: {
      category: 'Visionary',
      motto: "What's possible?",
      atYourBest:
        "When you're brainstorming, strategizing, and painting a picture of a brighter future for yourself and others.",
      summary:
        "Your mind naturally leaps forward \u2014 scanning for future possibilities, imagining what could be, and envisioning the bigger picture. While others may be stuck in today\u2019s details, you\u2019re already building tomorrow\u2019s world in your mind. Your strength is foresight: you connect dots others can\u2019t see yet, often spotting opportunities before they\u2019re obvious.\n\n" +
        "You are a natural strategist and innovator, connecting disparate dots to form a coherent and inspiring picture of tomorrow. Your energy is contagious, and you have a unique ability to motivate others with your optimism and foresight.",
      work:
        "Big-picture thinking fuels your motivation, but staying grounded in smaller milestones helps turn visions into reality. Surround yourself with detail-oriented teammates who can execute your ideas.\n\n" +
        "You excel in roles like entrepreneurship, innovation management, strategic planning, creative direction, or marketing. You need freedom to explore ideas. You may struggle in highly bureaucratic, detail-obsessed environments.\n\n" +
        "Pro-Tip: During meetings, balance your big ideas by asking, \u201CWhat are the immediate next steps?\u201D to show you value execution.",
      relationships:
        "Your ability to see potential can help family members dream bigger and prepare for the future. You inspire your family to dream big and plan exciting futures together. You might be the one planning next year's vacation in vivid detail. Be mindful that others may feel overwhelmed by constant talk of change.\n\n" +
        "Pro-Tip: Balance future-talk with present-moment rituals, like a device-free dinner where you talk about the best part of your day today.\n\n" +
        "You inspire friends with your forward-thinking ideas and ability to envision better outcomes. You may need to slow down and meet others in the present so they don\u2019t feel left behind. You bring an exciting sense of possibility to relationships, always thinking about shared goals and future adventures. Partners may appreciate when you pause to savor the current moment.\n\n" +
        "You are an exciting, inspiring partner and friend, always full of ideas for adventures and growth. However, loved ones might feel you are more in love with the potential of the relationship than the current reality of it.\n\n" +
        "Pro-Tip: Practice active listening and be fully present in conversations. Ask your partner, \u201CHow are you feeling right now?\u201D not just \u201CWhat should we do next?\u201D",
      growth: [
        "Integrate your visionary ideas with tangible next steps. Practice present-moment mindfulness to avoid living only in \u201Cwhat\u2019s next.\u201D",
        "Practice Mindfulness: Spend 5 minutes a day focusing solely on your breath or the sensations around you. This trains your brain to appreciate the present.",
        "Celebrate Small Wins: Acknowledge and reward yourself and your team for completing small milestones on the path to the big vision.",
      ],
      watchOutFor: [
        {
          title: 'The Idealism-Reality Gap',
          insight:
            "The thrilling, high-level vision in your mind can feel dull and frustrating when it meets the gritty reality of implementation. The necessary steps\u2014the budgets, the tedious tasks, the logistical hurdles\u2014can feel like anchors weighing down your balloon. This gap can lead to a cycle of starting projects with immense enthusiasm but abandoning them when the hard work begins, always chasing the dopamine hit of a new idea.",
          tips: [
            "The \u201CFirst Step\u201D Rule: For every visionary idea you have, force yourself to define the very next physical, actionable step. Not \u201Cbuild a company,\u201D but \u201Cemail Sarah to discuss the idea.\u201D This bridges the gap between the abstract future and the concrete present.",
            "Partner with a \u201CDoer\u201D: Be intentional about teaming up with someone who has an Analytical or Cautious Lens. Their natural ability to handle details and risk is the perfect complement to your big-picture strength. Frame it as a collaboration, not a constraint.",
            "Reverse-Engineer the Vision: Start with the end in mind and work backwards. If the goal is to launch a product in one year, what must be done each quarter, each month, each week? This makes the vision feel more manageable.",
          ],
        },
      ],
    },
    Reflective: {
      category: 'Reflective',
      motto: 'What does this mean?',
      atYourBest:
        "When you have the time and space to process your experiences, emotions, and interactions to find deeper understanding and personal growth.",
      summary:
        "You see life as a series of meaningful moments, each one worth unpacking. Your natural instinct is to pause, process, and learn from experiences \u2014 past and present. You\u2019re driven by a deep desire to understand both yourself and others, often using introspection as a guide for growth.\n\n" +
        "Your gaze is turned inward. You seek meaning, depth, and understanding in every experience. You are driven to process events emotionally and intellectually, learning from the past to navigate the present with wisdom.",
      work:
        "You excel at analyzing experiences to refine processes and avoid repeating mistakes.\n\n" +
        "You thrive in roles that require mentorship, counseling, coaching, writing, or deep research. You excel in environments that value thoughtful feedback and continuous improvement. You may struggle in high-pressure, \"shoot-from-the-hip\" cultures that mistake your reflection for indecisiveness.\n\n" +
        "Pro-Tip: In fast-moving meetings, preface your contributions with \u201CI\u2019ve been reflecting on X\u2026\u201D to signal that your thoughtful input is coming from a place of depth, not delay.",
      relationships:
        "You create stability by reflecting on what\u2019s worked and what hasn\u2019t, often serving as a grounding force for those around you.\n\n" +
        "You create a home environment that values meaningful conversation and emotional safety. You are likely the family historian or the one everyone comes to for thoughtful advice.\n\n" +
        "Pro-Tip: Be mindful that not everyone processes things at your depth. Give family members space to have lighter interactions without feeling pressured to dive deep every time.\n\n" +
        "You build incredibly deep, trusting, and intimate bonds. You are a phenomenal listener and make your partners and friends feel truly seen and understood. The risk is holding onto past hurts or misunderstandings long after they are relevant.\n\n" +
        "Friends trust you as a thoughtful confidant who listens deeply and offers considered advice. Just remember to balance listening with expressing your own needs.\n\n" +
        "You build relationships with intention, taking the time to truly know someone before fully opening up. Your depth can foster strong bonds, though you may need to guard against holding onto past hurts.",
      growth: [
        "Balance reflection with forward action. Use your insights as a springboard, not a stop sign.",
        "Schedule Reflection Time: Contain your processing. Instead of ruminating all day, schedule 20 minutes of \u201Cworry time\u201D or journaling time. When thoughts arise outside that time, note them and promise to address them later.",
        "Move Your Body: When you feel stuck in your head, go for a walk or do a workout. Physical activity can break the cycle of circular thinking.",
      ],
      watchOutFor: [
        {
          title: 'Analysis Paralysis',
          insight:
            "The desire to understand every angle and potential outcome can lead to endless circling without a decision. You may believe you need 100% clarity before acting, but life is often ambiguous. This can result in missed opportunities and frustration, both for you and those waiting for your decision.",
          tips: [
            "Set Decision Deadlines: Give yourself a reasonable time limit for research and reflection. When the timer goes off, you must decide. For example, \u201CI will research these three options for 30 minutes, and then I will choose one.\u201D",
            "The 70% Rule: Instead of waiting for 100% certainty, act when you have about 70% of the information you feel you need. You will learn more by doing and adjusting than by endless pre-planning.",
            "Define the \u201CGood Enough\u201D Outcome: Ask yourself, \u201CWhat is the minimum acceptable outcome here?\u201D Often, the pressure for a perfect decision is what causes paralysis. Aiming for \u201Cgood enough\u201D can be liberating.",
          ],
        },
      ],
    },
    Cautious: {
      category: 'Cautious',
      motto: 'What could go wrong?',
      atYourBest:
        "In situations that require careful planning, risk assessment, and contingency thinking. You are the one who keeps everyone safe and prepared.",
      summary:
        "You\u2019re a master risk assessor, scanning for pitfalls before stepping forward. Your careful approach means you rarely stumble into trouble unprepared. You prioritize stability, safety, and smart planning, making you dependable in uncertain situations.\n\n" +
        "You are the lookout on the ship, constantly scanning the horizon for storms. Your mind is a sophisticated risk-assessment tool. This is not pessimism; it's preparedness. You provide immense value by ensuring stability, security, and by helping others avoid costly mistakes they hadn't foreseen.",
      work:
        "You shine in risk management, quality control, and planning-focused roles. Your ability to foresee challenges helps projects avoid costly mistakes.\n\n" +
        "You are indispensable in fields like finance, engineering, law, compliance, project management, and healthcare\u2014anywhere where oversight and risk mitigation are critical. You may frustrate more visionary colleagues by pointing out flaws in their plans.\n\n" +
        "Pro-Tip: Frame your cautious advice positively: \u201CI'm excited about this idea. To make it more robust, let's consider how we might handle X challenge.\u201D",
      relationships:
        "You bring security and preparedness to your household. You are the family's safeguard. You have the insurance, the emergency kits, and the backup plans that make everyone feel secure.\n\n" +
        "You are a loyal, reliable, and steady partner. You build trust slowly and carefully, which creates a strong foundation. Your partner may sometimes crave more spontaneity and adventure.\n\n" +
        "Pro-Tip: Occasionally, let your partner plan a surprise or try something new without you first vetting it. Practice saying \u201Cyes\u201D to a small, spontaneous idea and see what happens.\n\n" +
        "Friends value your steady, grounded presence. Just be mindful not to seem overly cautious to those who thrive on spontaneity.\n\n" +
        "You build trust slowly, preferring to feel fully secure before committing. Partners may appreciate your loyalty but might also crave more spontaneity.",
      growth: [
        "Focus on Your Resilience: Remind yourself of past challenges you have successfully handled. Your ability to cope is likely much greater than your fear tells you.",
        "Define \u201CSafe Enough\u201D: Not every decision requires maximum safety. Ask, \u201CWhat does 'safe enough' look like for this situation?\u201D This allows for more flexibility.",
      ],
      watchOutFor: [
        {
          title: 'The "What If" Spiral',
          insight:
            "Your brain's threat-detection system is so good that it can flag unlikely events as imminent dangers. This can lead to a spiral of \u201Cwhat if\u201D thinking that generates anxiety and prevents action. The fear of a potential negative outcome can become larger than the reality of the situation.",
          tips: [
            "Probability Testing: When you identify a risk, ask yourself: \u201CWhat is the actual probability of this happening on a scale of 1-10?\u201D and \u201CIf it did happen, how bad would it truly be, and could I handle it?\u201D This engages the logical part of your brain to calm the emotional fear response.",
            "\u201CBest Case/Worst Case/Most Likely Case\u201D: For any decision, outline these three scenarios. Often, you'll find the \u201Cmost likely\u201D case is manageable, and the \u201Cbest case\u201D makes the risk worth taking.",
            "Start with \u201CMicro-Risks\u201D: Expand your comfort zone gradually. Take a very small, calculated risk that has a low stakes outcome (e.g., trying a new food, taking a different route home). This builds your confidence in handling uncertainty.",
          ],
        },
      ],
    },
    Analytical: {
      category: 'Analytical',
      motto: 'How does this work?',
      atYourBest:
        "When faced with a complex problem that requires logical dissection, data analysis, and systematic thinking to solve.",
      summary:
        "You process the world through logic, structure, and evidence. When faced with a challenge, you dissect it into parts, seeking clarity before action.\n\n" +
        "You see the world as a complex machine, and you are fascinated by how the gears turn. Your strength is your objectivity and your ability to remove emotion from a situation to see the clear, logical path forward. You are a natural problem-solver, valued for your clarity and precision.",
      work:
        "You excel in data-driven, problem-solving, or process-oriented roles. Others count on you to see through the noise and find the facts.\n\n" +
        "You excel as a data analyst, scientist, engineer, logician, programmer, or strategist. You are the go-to person for fixing broken processes and making evidence-based decisions. You may struggle in roles that require high levels of emotional labor or ambiguity.\n\n" +
        "Pro-Tip: When presenting data, remember to tell a story with it. People connect to narratives, not just spreadsheets.",
      relationships:
        "You bring order and efficiency to your household. You are the one who optimizes the grocery list, finds the best deals, and creates systems that save time and money.\n\n" +
        "Pro-Tip: Not everything in family life needs to be optimized for efficiency. Sometimes, a lazy, unstructured Sunday is more valuable than a perfectly planned one. Allow for messiness.\n\n" +
        "You are a reliable, logical, and honest partner. You show love through practical solutions and acts of service. Your partner may sometimes feel that you are trying to \u201Cfix\u201D them rather than just be with them.\n\n" +
        "Pro-Tip: Learn your partner's \u201Clove language.\u201D If it's Words of Affirmation, practice giving compliments. If it's Quality Time, put your phone away and be fully present without analyzing the activity.\n\n" +
        "Friends come to you for clarity, knowing you\u2019ll give them a logical perspective. Remember to pair reason with empathy when offering advice.\n\n" +
        "You approach relationships thoughtfully, preferring to understand dynamics before making emotional commitments. Partners may appreciate your reliability but sometimes wish for more emotional spontaneity.",
      growth: [
        "Ask \u201CWhy\u201D Five Times: When you identify a problem, ask \u201Cwhy\u201D iteratively to get to the root cause, which is often an emotional need (e.g., fear, need for security, desire for recognition).",
        "Develop Heuristics: To avoid analysis paralysis, create simple rules of thumb for low-stakes decisions (e.g., \u201CIf a work task takes less than 2 minutes, I do it immediately\u201D).",
      ],
      watchOutFor: [
        {
          title: 'The Data vs. Emotion Divide',
          insight:
            "You may dismiss or feel uncomfortable with emotions (yours and others') because they seem illogical and unquantifiable. This can lead to being perceived as cold, detached, or critical when someone needs empathy, not solutions. You might try to \u201Csolve\u201D a person's feelings instead of just acknowledging them.",
          tips: [
            "Practice \u201CEmpathic Listening\u201D: When someone is upset, make it your goal to understand and validate their feeling first, before offering any solution. Use phrases like, \u201CThat sounds really frustrating,\u201D or \u201CI can see why you'd feel that way.\u201D This is not illogical; it's a strategic way to build trust and connection.",
            "The \u201CFeeling\u201D Check-In: Regularly ask yourself, \u201CWhat am I feeling right now?\u201D and just name it (frustrated, anxious, excited). Don't analyze why, just acknowledge it. This builds your emotional vocabulary and awareness.",
            "See Emotion as Data: Frame emotions as another form of data to consider. For example, \u201CThe metrics say this project is a success, but team morale is low. That is a data point we need to investigate.\u201D",
          ],
        },
      ],
    },
  },
};
