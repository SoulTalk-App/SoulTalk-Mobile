/**
 * Focus Factor personality test.
 * Content transcribed verbatim from:
 *   /Users/vidishraj/Desktop/SoulTalk/Personality Test Focus Factor.docx
 *
 * locked=true for this release — shown on the hub with a "Coming soon" chip.
 * Flip locked=false in a future release to unlock.
 */
import { TestDefinition } from './types';

export const focusFactor: TestDefinition = {
  id: 'focus_factor',
  version: 'v1',
  title: 'Focus Factor',
  tagline: 'Uncover your natural rhythm of attention.',
  about:
    "Focus Factor uncovers your natural rhythm of attention \u2014 whether you dive deep into one thing, jump between multiple priorities, or adapt fluidly depending on what life throws at you. Your focus style affects productivity, stress levels, creativity, and how you connect with people. By knowing your focus pattern, you can stop fighting your brain and instead set up your work, home, and relationships to match your strengths.\n\n" +
    "Are you a master of deep work, a sprint specialist, a multitasking maestro, or a flexible adapter? Take this quiz to discover your unique Focus Factor. Unlock personalized strategies to design your work, your space, and your life in a way that doesn't fight your brain\u2014but fuels it.\n\n" +
    "How it works: 25 statements. Rate each on a scale of 1 (Strongly Disagree) to 5 (Strongly Agree). Answer intuitively and honestly\u2014there are no right or wrong answers.",
  locked: true,
  categories: ['Deep Diver', 'Sprinter', 'Juggler', 'Adaptive'],
  questions: [
    { id: 'q1', text: 'I prefer to finish one task completely before starting another.', category: 'Deep Diver' },
    { id: 'q2', text: 'I get distracted easily when working on something I find boring.', category: 'Sprinter' },
    { id: 'q3', text: 'I work best under tight deadlines.', category: 'Sprinter' },
    { id: 'q4', text: 'I notice small details that others overlook.', category: 'Deep Diver' },
    { id: 'q5', text: 'I can focus for long periods without needing breaks.', category: 'Deep Diver' },
    { id: 'q6', text: 'I get restless if I have to stick to the same activity too long.', category: 'Juggler' },
    { id: 'q7', text: 'I tend to start new projects before finishing old ones.', category: 'Juggler' },
    { id: 'q8', text: 'I use lists, calendars, or systems to keep myself on track.', category: 'Adaptive' },
    { id: 'q9', text: 'I do my best thinking when I\u2019m \u201Cin the zone.\u201D', category: 'Deep Diver' },
    { id: 'q10', text: 'I feel energized by juggling multiple priorities.', category: 'Juggler' },
    { id: 'q11', text: 'I lose track of time when working on something engaging.', category: 'Deep Diver' },
    { id: 'q12', text: 'I prefer variety over routine in my daily work.', category: 'Juggler' },
    { id: 'q13', text: 'I find it easy to block out distractions.', category: 'Deep Diver' },
    { id: 'q14', text: 'I get frustrated when my workflow is interrupted.', category: 'Deep Diver' },
    { id: 'q15', text: 'I sometimes procrastinate until pressure builds.', category: 'Sprinter' },
    { id: 'q16', text: 'I set clear goals before starting any major task.', category: 'Adaptive' },
    { id: 'q17', text: 'I often multitask between several activities.', category: 'Juggler' },
    { id: 'q18', text: 'I need structure to stay productive.', category: 'Adaptive' },
    { id: 'q19', text: 'I can adapt quickly if plans change suddenly.', category: 'Adaptive' },
    { id: 'q20', text: 'I feel most productive when I\u2019m busy with many different things.', category: 'Juggler' },
    { id: 'q21', text: 'I take short breaks to keep my mind fresh.', category: 'Adaptive' },
    { id: 'q22', text: 'I like having one main project to focus on at a time.', category: 'Deep Diver' },
    { id: 'q23', text: 'I feel stressed when I have too much to do at once.', category: 'Deep Diver' },
    { id: 'q24', text: 'I sometimes struggle to refocus after an interruption.', category: 'Sprinter' },
    { id: 'q25', text: 'I\u2019m at my best when I can immerse deeply in one thing.', category: 'Deep Diver' },
  ],
  results: {
    'Deep Diver': {
      category: 'Deep Diver',
      motto: 'Go deep or go home.',
      atYourBest:
        "When immersed in a complex, engaging problem for hours without interruption.",
      summary:
        "Deep Divers are masters of sustained attention. When you lock onto a task, you can lose yourself in it for hours \u2014 sometimes forgetting the world exists. Your mind loves to drill down, connecting tiny details into a complete picture. While the world races from task to task, you\u2019re building depth, precision, and mastery.\n\n" +
        "You are not just focused; you are absorbed. For you, focus is a state of flow\u2014a deep, almost meditative immersion where time dissolves and the outside world fades. Your superpower is your ability to tunnel into a subject, connecting intricate details to form a profound and complete understanding. You are the architect, the researcher, the master craftsman, valuing depth and precision above all else.",
      work:
        "You thrive in environments where you can work uninterrupted. You excel in roles that reward expertise and concentration. Think software development, academic research, writing, data analysis, engineering, or detailed creative work; roles like research, writing, coding, or design can be ideal, as long as deadlines allow you to dig deep. You are most productive in environments you can control.",
      relationships:
        "Structure and predictability help you feel grounded. You may prefer having routines, clear responsibilities, and a calm home environment. Sudden changes can feel disruptive, so communicating your need for stability can prevent misunderstandings.\n\n" +
        "Quality over quantity is your style. You invest in a smaller circle of close connections rather than spreading your energy thin. Friends appreciate your attentiveness and thoughtful listening.\n\n" +
        "You\u2019re devoted and steady when committed. Partners may need to understand that once you\u2019re deep in a project, your attention may be harder to pull away \u2014 it\u2019s not disinterest, it\u2019s focus.\n\n" +
        "Your social style mirrors your focus style: you prefer a few deep, meaningful connections over a wide network of acquaintances. You are a loyal, attentive friend and partner who listens deeply and offers thoughtful advice. However, loved ones might sometimes mistake your deep focus for disinterest.\n\n" +
        "Pro-Tip: Communicate your patterns. A simple, \u201CI'm going to be heads-down on this project for a few hours, but I'll be fully present with you at dinner\u201D manages expectations perfectly.",
      growth: [
        "Add moments of variety to prevent burnout. Breaks, short walks, or switching to a lighter task for a few minutes can keep you sharp. Practice pivoting when unexpected changes arise so you\u2019re not thrown off course.",
        "The modern world is not built for Deep Divers. Your key to balance is strategic isolation. Carve out and fiercely defend your distraction-free zones.",
        "Practice planned emergence. Schedule short breaks to stretch, hydrate, and shift your gaze to something distant to prevent eye strain and mental fatigue. Learn to recognize the point of diminishing returns on a task to avoid perfectionism.",
      ],
      watchOutFor: [
        {
          title: 'Frustration with Interruptions',
          insight:
            "For you, an interruption isn't just a 30-second question. It's a \u201Ccontext switch\u201D that can cost you 15-20 minutes of prime mental energy to re-enter the state of deep concentration you were in. This is neurologically draining and feels like having to climb a mountain you've already summited. The frustration is a valid response to a genuine productivity killer.",
          tips: [
            "Create Visual \u201CDo Not Disturb\u201D Signals: A closed door, specific hat, or a particular light at your desk that signals to others, \u201CI am in deep work mode.\u201D Train your colleagues/family that this signal is as sacred as you being in an important meeting.",
            "Schedule \u201COffice Hours\u201D: Instead of being available all the time, block 2-3 specific hours in your day for deep work (e.g., 9 AM - 12 PM). Then, block 1-2 specific hours for being available (e.g., 2 PM - 4 PM). Communicate this schedule. People are more respectful of boundaries when they are predictable.",
            "Leverage Technology: Use \u201CFocus Mode\u201D on your devices, turn off notifications, and use an app like Freedom or Cold Turkey to block distracting websites during your deep work blocks.",
            "The \u201CInterruption Log\u201D: If interrupted, say, \u201CI'm in the middle of something important, can I come find you at [specific time]?\u201D This acknowledges them while protecting your focus.",
          ],
        },
        {
          title: 'Perfectionism',
          insight:
            "Your love for depth can morph into a fear of releasing anything that isn't \u201Cperfect.\u201D This often stems from a desire for mastery and a fear of criticism. You might get stuck in an endless loop of tweaking, researching, and refining, which leads to missed deadlines and projects that never see the light of day. The enemy of \u201Cgood enough\u201D is often \u201Cperfect.\u201D",
          tips: [
            "The 80/20 Rule: Consciously aim for 80% completion instead of 100%. Often, 80% of the value is achieved with 20% of the effort. The final 20% of polish often takes 80% of the time. Ask yourself: \u201CIs this extra effort proportional to the value it adds?\u201D",
            "Time-Boxing: Instead of working on a task until it's \u201Cdone,\u201D assign it a fixed amount of time (e.g., \u201CI will work on this presentation for 3 hours\u201D). When the time is up, you ship it. This forces prioritization of the most critical elements.",
            "Define \u201CDone\u201D: Before you start a task, write down the specific criteria for what will make it \u201Ccomplete.\u201D For example, \u201CThe report is done when: 1) Research is included, 2) Key findings are summarized, 3) It is proofread for major errors.\u201D Once you hit these criteria, you stop.",
          ],
        },
      ],
    },
    Sprinter: {
      category: 'Sprinter',
      motto:
        "Why do today what you can do tomorrow? (Just kidding, I'll crush it in an hour tonight).",
      atYourBest:
        "When the pressure is on, the deadline is looming, and adrenaline is high.",
      summary:
        "Sprinters operate in bursts of intense productivity. When the clock is ticking or the stakes are high, you shift into high gear and deliver results fast.\n\n" +
        "You are the master of the deadline. You operate in powerful, high-octane bursts of productivity, fueled by a sense of urgency and the thrilling race against the clock. While others might crumble under pressure, you come alive. Your mind is optimized for quick, efficient action, cutting through distractions to achieve a single, clear goal. You are the first responder, the crisis manager, the last-minute hero.",
      work:
        "You thrive in project-based, fast-paced environments with clear, short-term objectives. Fields like journalism, emergency services, sales closing, or event-day coordination suit your rhythm. You may get bored in long, drawn-out processes, so build in checkpoints to keep things interesting.\n\n" +
        "Pro-Tip: Trick your brain by creating artificial deadlines. Break large projects into smaller \u201Csprints\u201D with their own mini-deadlines to maintain momentum and avoid the stress of one giant, last-minute panic.",
      relationships:
        "You thrive on momentum and may enjoy tackling house projects in concentrated bursts. You\u2019re likely the one to jump in when there\u2019s an urgent need.\n\n" +
        "Your energy can be infectious, inspiring others to take action. You might disappear between bursts of connection, so intentional check-ins can keep relationships strong.\n\n" +
        "Romantic intensity and shared adventures keep the spark alive. Long stretches of monotony might make you restless, so communicate your need for novelty.\n\n" +
        "You are spontaneous and bring exciting, infectious energy to your relationships. You're the friend who plans an impromptu adventure or rallies the group to solve a problem. The downside? You might \u201Cgo dark\u201D between sprints, which can be misinterpreted.\n\n" +
        "Pro-Tip: Schedule low-pressure, recurring social activities (e.g., a weekly phone call or coffee) to maintain connections during your \u201Coff\u201D cycles.",
      growth: [
        "Learn to manage the downtime between sprints without slipping into procrastination. Use light structure to keep yourself moving.",
        "Your challenge is managing the \u201Cdowntime valley\u201D between sprints. Without a deadline, motivation can wane. Use this time for lighter, administrative tasks, learning, or networking.",
        "The key is to structure your freedom. Use tools like time-blocking to dedicate specific, short periods to tasks you'd normally procrastinate on, making them feel like a mini-sprint.",
      ],
      watchOutFor: [
        {
          title: 'The Anxiety of Procrastination',
          insight:
            "The \u201CSprint\u201D doesn't start until the fear of consequences outweighs the discomfort of starting. This leads to a period of avoidance, which is not laziness\u2014it's often filled with low-grade anxiety, guilt, and background mental chatter about the task you're not doing. This \u201Cpre-pressure\u201D period is often more draining than the work itself.",
          tips: [
            "The 5-Minute Rule: The hardest part is starting. Tell yourself, \u201CI will just work on this for 5 minutes.\u201D Anyone can do 5 minutes. Often, the act of starting breaks the initial resistance, and you'll find yourself continuing well past the 5-minute mark.",
            "Break the Monolith: Large, vague tasks (\u201CWrite report\u201D) are paralyzing. Break them into tiny, ridiculously easy \u201CSprint-able\u201D tasks that take less than 15-20 minutes. Instead of \u201CWrite report,\u201D your list should be: \u201C1. Open document. 2. Write headline. 3. Bullet 3 main points. 4. Find first source.\u201D Crossing these off creates momentum.",
            "Create Artificial Accountability: Tell a colleague, \u201CI'm going to send you the first draft of my introduction by 2 PM today.\u201D Now, there's a social cost to procrastinating, which can trigger your sprint reflex healthily.",
          ],
        },
        {
          title: 'The Burnout Cycle (Boom & Bust)',
          insight:
            "Your workflow is a series of intense sprints followed by recovery periods. The danger is that the sprints become too intense and too frequent, and the recovery periods become periods of total shutdown and guilt. This \u201Call gas or all brakes\u201D pattern is unsustainable and leads to exhaustion.",
          tips: [
            "Schedule Your Sprints & Recovery Intentionally: If you know you have a big deadline Friday, plan your week around it. Monday: Break down the project (light work). Tuesday/Wednesday: Two 90-minute \u201Csprints\u201D on the project (moderate work). Thursday: Two more intense sprints (serious work). Friday Morning: Final sprint and polish (peak work). Friday Afternoon: Mandatory light work\u2014clearing emails, organizing files\u2014not a new project. This plans for the post-sprint crash instead of being surprised by it.",
            "Debrief After a Sprint: After a big push, take 15 minutes to write down: What went well? What made that last-minute rush so stressful? How could I have started earlier? This reflection helps you learn from the cycle without self-judgment.",
            "Fuel the Machine: During a sprint, it's easy to forget to eat, hydrate, and sleep. Recognize that these are non-negotiable performance requirements. Proper fuel makes your sprints more effective and less damaging.",
          ],
        },
      ],
    },
    Juggler: {
      category: 'Juggler',
      motto:
        "Don't put all your eggs in one basket. Put them in ten baskets and spin all the plates!",
      atYourBest:
        "When you have multiple projects in flight, emails pinging, and a to-do list that would terrify others.",
      summary:
        "You thrive when you have many plates spinning \u2014 switching gears keeps you engaged and prevents boredom.\n\n" +
        "Boredom is your nemesis, and variety is your oxygen. You are a natural multitasker, energized by the dynamic dance between different priorities. Your brain is a brilliant switchboard, rapidly toggling between contexts without missing a beat. This makes you incredibly flexible, responsive, and indispensable in fast-changing environments. You are the conductor of your own personal orchestra of tasks.",
      work:
        "You are built for roles that demand constant context-switching. Entrepreneurship, management, customer success, executive assistance, or parenting (the ultimate juggling act) are where you shine; dynamic roles like event planning, entrepreneurship, or crisis management keep you engaged.\n\n" +
        "Pro-Tip: Your best tool is a \u201Ccapture system\u201D\u2014a trusted notebook or app where you can instantly dump ideas and tasks so they don't get lost in the shuffle. Review it daily to re-prioritize.",
      relationships:
        "You may be the household\u2019s go-to problem solver, adapting as plans change. Be mindful not to overcommit yourself to everyone\u2019s needs.\n\n" +
        "You connect easily with diverse people and can maintain many relationships at once. The challenge is keeping depth in the connections that matter most.\n\n" +
        "You keep things lively and unpredictable. Partners may need reassurance that your shifting attention doesn\u2019t mean lack of interest.\n\n" +
        "You have a wide and diverse social circle. You're a social butterfly who enjoys connecting with many different people and are often the hub of your social network. The challenge can be ensuring your closest relationships get enough of your undivided attention.\n\n" +
        "Pro-Tip: Practice \u201Csingle-tasking\u201D in conversations. Put your phone away and be fully present during quality time with loved ones.",
      growth: [
        "Your greatest need is conscious prioritization. The risk of the Juggler is spreading your energy so thin that nothing gets the depth it deserves.",
        "Regularly ask yourself: \u201CWhat are my top 3 priorities right now?\u201D Learn to say no or delegate tasks that don't align with your core goals.",
        "Schedule short \u201Cfocus bursts\u201D of 20-25 minutes on a single task to build your deep focus muscle.",
      ],
      watchOutFor: [
        {
          title: 'Fragmented Attention & Surface-Level Engagement',
          insight:
            "Constant context-switching, even if you're good at it, has a cognitive cost. Neuroscientists call it \u201Cattention residue\u201D\u2014part of your brain is still thinking about the previous task when you switch. This means you might be present on ten tasks but rarely giving any single one your full, undivided cognitive capacity. This can lead to ideas that are a mile wide but an inch deep, and a feeling of being busy all day without tangible progress on what truly matters.",
          tips: [
            "Thematic Time Blocking: Instead of switching tasks every 10 minutes, group similar tasks into \u201Cthemes.\u201D For example: \u201CCreator Block\u201D (9-11 AM for focused work), \u201CCollaborator Block\u201D (11 AM-1 PM for meetings and calls), \u201CCoordinator Block\u201D (3-4 PM for emails and admin). This contains the multitasking within a defined zone, freeing up other blocks for deeper engagement.",
            "The \u201COne Thing\u201D Question: Each morning, ask yourself: \u201CIf I accomplish only one thing today, what would make me feel most successful?\u201D Write that down. Keep it visible. This acts as your North Star, ensuring that no matter how much juggling you do, you gravitate back to your top priority.",
            "Single-Tasking Practice: Build your focus muscle. Use a timer for 25 minutes and work on just one task. Close all other tabs and apps. It will feel uncomfortable at first, like a runner training for a different sport, but it will increase the quality of your output on critical projects.",
          ],
        },
      ],
    },
    Adaptive: {
      category: 'Adaptive',
      motto: "The only constant is change. And I'm ready for it.",
      atYourBest:
        "When the plan falls apart, priorities shift, and you need to seamlessly transition from deep work to putting out fires.",
      summary:
        "Adaptive Focus types shift seamlessly between deep work and rapid multitasking. You can settle in for long stretches when needed, then pivot quickly when priorities change. This makes you a bridge between different working styles.\n\n" +
        "You are the chameleon of focus. You don't have one single style; you have a versatile toolkit. You can dive deep for a morning of analytical work, pivot to juggle team requests in the afternoon, and sprint to meet a surprise deadline before dinner. This incredible flexibility makes you a stabilizing force on any team and highly resilient to the chaos of modern life. You are the ultimate utility player.",
      work:
        "You can thrive in almost any environment, making you ideal for hybrid roles. You\u2019re valuable in teams because you can meet others where they are.\n\n" +
        "You are invaluable in roles that require bridging different departments or working styles\u2014think project management, consulting, team leadership, or client-facing technical roles. You can speak the language of both the Deep Divers and the Jugglers.\n\n" +
        "Pro-Tip: Your strength is your range, but you still need to be intentional. At the start of each day or week, consciously choose which focus mode a task requires, rather than just reacting.",
      relationships:
        "You\u2019re the calm center in shifting situations. You balance the need for structure with flexibility, adjusting plans without losing momentum.\n\n" +
        "Your adaptability allows you to connect with a wide range of personalities. You can match others\u2019 energy, making you easy to be around.\n\n" +
        "You can meet a partner\u2019s needs in different seasons of life, adjusting without losing the relationship\u2019s core stability.\n\n" +
        "You are incredibly easy to get along with because you can match the energy and needs of those around you. You can be a thoughtful listener for a Deep Diver friend or keep up with the spontaneous energy of a Sprinter.\n\n" +
        "Pro-Tip: Ensure you are also getting your needs met. Your adaptability can sometimes mean you suppress your own preferences. Check in with yourself regularly.",
      growth: [
        "Your paramount need is strong boundaries and self-awareness. Because you can do everything, you might be asked to do everything. You must be the guardian of your own energy and priorities.",
        "Schedule non-negotiable time for your most important deep work first, and then allow your flexible nature to handle the rest of the day.",
        "Define your core goals so that your adaptability serves your agenda, not someone else's.",
      ],
      watchOutFor: [
        {
          title: 'Losing Your Priorities (The Chameleon Effect)',
          insight:
            "Because you can seamlessly slot into any mode, you risk becoming a reactive force in your own life. Your agenda gets hijacked by the agendas of others. Your day becomes a series of responses to external stimuli\u2014other people's \u201Curgent\u201D requests, shifting organizational priorities, the latest email in your inbox. This can lead to a feeling of working hard all day but ending it feeling unfulfilled and wondering what you actually accomplished.",
          tips: [
            "The Priority Anchor: Before you check email or messages each morning, define your \u201CPriority Anchor\u201D\u2014the one thing that you need to move forward on your most important goal or project. Write it on a post-it note. This is your anchor. No matter how much the day shifts, your goal is to protect time for this anchor task.",
            "Time-Blocking for Yourself First: At the start of each week, before anyone else can make claims on your time, schedule non-negotiable blocks for your deep, strategic work. Label them visibly on your calendar as \u201CFocus Time\u201D or \u201CProject Work.\u201D When a request comes in, you can adapt around these blocks, saying, \u201CI have a commitment then, but I'm free at [other time].\u201D This flips the script: you are adapting your schedule, not your priorities.",
            "The \u201CWhy\u201D Check: When a new request or shifting priority comes in, pause. Ask yourself and/or the requester: \u201CHow does this align with our top quarterly goal?\u201D or \u201CWhat is the ultimate objective here?\u201D This simple question can often reveal if a \u201Cshifting priority\u201D is truly strategic or just a distraction in disguise.",
          ],
        },
        {
          title: 'Identity Confusion & Drain',
          insight:
            "\u201CIf I can be anything, who am I?\u201D Adapting constantly is emotionally and mentally draining because it involves suppressing your own natural impulses in the moment to serve the context. You might feel pressure to always be \u201Con\u201D and available, leading to a slow leak of energy and a blurred sense of your own working preferences.",
          tips: [
            "Schedule Energy Audits: Set a calendar reminder for once a month titled \u201CHow am I really working?\u201D Reflect: When did I feel most energized this month? When did I feel most drained? Was I mostly in reactive or proactive mode? This builds self-awareness around what environments and tasks truly suit you, not just what you're capable of.",
            "Define Your Core Values: Get clarity on what is non-negotiable for you in your work and life (e.g., learning, autonomy, impact, collaboration). Use these values as a compass. When asked to adapt in a way that violates a core value (e.g., being asked to cut ethical corners for speed), you have a clear basis to politely push back or reframe the request.",
            "Embrace Your Role as a Bridge: Instead of seeing your adaptability as a lack of a single identity, reframe it as your superpower. You are a translator who can connect Deep Divers with Sprinters. You are a stabilizer who can keep a project on track when plans change. Naming this valuable role can turn identity confusion into a powerful professional identity.",
          ],
        },
      ],
    },
  },
};
