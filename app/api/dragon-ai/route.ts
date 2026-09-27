// app/api/dragon-ai/route.ts

import { NextRequest, NextResponse } from "next/server";

/*
 * ============================================================
 * DRAGON AI — CHALLENGE + MARKET INTELLIGENCE API
 * ============================================================
 *
 * Dragon AI has two jobs:
 *
 * 1. Dragon Economist
 *    - Reads the current market
 *    - Calculates demand gap
 *    - Calculates market status
 *    - Calculates vault risk
 *
 * 2. Dragon Dungeon Master
 *    - Creates a challenge for the current floor
 *    - Provides challenge type
 *    - Provides title
 *    - Provides description
 *    - Provides difficulty
 *    - Provides objective
 *    - Provides time limit
 *
 * IMPORTANT:
 *
 * Dragon AI DOES NOT decide the gambling outcome.
 *
 * Chain VRF:
 *     → provides randomness
 *
 * Smart contract:
 *     → determines the authoritative outcome
 *     → handles settlement
 *     → handles payout
 *
 * Player:
 *     → decides whether to EXTRACT or DESCEND
 *
 * ============================================================
 */


/*
 * ============================================================
 * CHALLENGE TYPES
 * ============================================================
 */

type ChallengeType =
  | "RUN"
  | "CATCH"
  | "SHOOT"
  | "DODGE"
  | "MEMORY"
  | "STRIKE"
  | "AIM"
  | "DOOR";


/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

interface DragonAIRequest {
  floor?: number;
  multiplier?: number;

  supply?: number;
  demand?: number;
  price?: number;

  trend?: string;
}


/*
 * ============================================================
 * CHALLENGE TEMPLATE
 * ============================================================
 */

interface ChallengeTemplate {
  type: ChallengeType;

  titles: string[];

  descriptions: string[];
}


/*
 * ============================================================
 * DRAGON CHALLENGE LIBRARY
 * ============================================================
 *
 * The AI currently selects from these challenge templates.
 *
 * Later this can be connected to a real LLM so the Dragon
 * Dungeon Master can generate more dynamic challenges.
 *
 * ============================================================
 */

const challengeTemplates: ChallengeTemplate[] = [

  /*
   * ----------------------------------------------------------
   * RUN
   * ----------------------------------------------------------
   */

  {
    type: "RUN",

    titles: [
      "THE DRAGON'S RUN",
      "THE BURNING CORRIDOR",
      "THE VAULT SPRINT",
    ],

    descriptions: [
      "Run through the vault while avoiding cursed obstacles.",

      "Change lanes before the collapsing vault catches you.",

      "Escape the dragon's corridor and reach the treasure gate.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * CATCH
   * ----------------------------------------------------------
   */

  {
    type: "CATCH",

    titles: [
      "THE FALLING HOARD",
      "GOLD FROM THE SKY",
      "THE TREASURE STORM",
    ],

    descriptions: [
      "Catch falling treasure before it disappears into the darkness.",

      "Move your hoard basket and collect the falling crystals.",

      "The vault is dropping treasure. Catch enough before time runs out.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * SHOOT
   * ----------------------------------------------------------
   */

  {
    type: "SHOOT",

    titles: [
      "THE DRAGON'S TARGETS",
      "TARGETS OF THE FORGOTTEN KING",
      "THE GOLDEN MARKSMAN",
    ],

    descriptions: [
      "Hit the glowing targets before the vault closes.",

      "Destroy the cursed targets hidden inside the chamber.",

      "Strike the golden targets to unlock the next passage.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * DODGE
   * ----------------------------------------------------------
   */

  {
    type: "DODGE",

    titles: [
      "FIRE OF THE DRAGON",
      "THE FLAME CORRIDOR",
      "ESCAPE THE INFERNO",
    ],

    descriptions: [
      "Dodge incoming fireballs and survive the chamber.",

      "Move through the corridor without being hit by dragon fire.",

      "The dragon has awakened. Survive the incoming flames.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * MEMORY
   * ----------------------------------------------------------
   */

  {
    type: "MEMORY",

    titles: [
      "THE MEMORY RUNE",
      "THE ANCIENT SIGIL",
      "THE FORGOTTEN SEQUENCE",
    ],

    descriptions: [
      "Remember the rune sequence and reproduce it correctly.",

      "The ancient vault reveals a sequence for only a moment.",

      "Study the symbols carefully before the chamber goes dark.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * STRIKE
   * ----------------------------------------------------------
   */

  {
    type: "STRIKE",

    titles: [
      "THE DRAGON GUARD",
      "THE GOLDEN SENTINEL",
      "THE VAULT WARDEN",
    ],

    descriptions: [
      "Strike the correct target before the guardian attacks.",

      "Choose the correct opening and strike the vault guardian.",

      "The guardian protects the hoard. Find its weak point.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * AIM
   * ----------------------------------------------------------
   */

  {
    type: "AIM",

    titles: [
      "THE CRYSTAL SHOT",
      "THE DRAGON'S EYE",
      "THE PRECISION VAULT",
    ],

    descriptions: [
      "Aim carefully and hit the moving crystal.",

      "Only a precise shot will unlock this chamber.",

      "Time your shot and strike the crystal at the right moment.",
    ],
  },


  /*
   * ----------------------------------------------------------
   * DOOR
   * ----------------------------------------------------------
   */

  {
    type: "DOOR",

    titles: [
      "THE THREE GATES",
      "THE FORBIDDEN DOORS",
      "THE DRAGON'S CHOICE",
    ],

    descriptions: [
      "Three doors stand before you. Choose your path carefully.",

      "Only one passage leads deeper into the dragon's vault.",

      "The dragon has hidden the safe path behind one of the gates.",
    ],
  },
];


/*
 * ============================================================
 * DIFFICULTY
 * ============================================================
 */

function getDifficulty(floor: number): string {

  if (floor <= 2) {
    return "EASY";
  }

  if (floor <= 4) {
    return "MEDIUM";
  }

  if (floor <= 7) {
    return "HARD";
  }

  if (floor <= 12) {
    return "VERY HARD";
  }

  return "EXTREME";
}


/*
 * ============================================================
 * RISK LEVEL
 * ============================================================
 */

function getRiskLevel(
  floor: number,
  demand: number,
  supply: number
): string {

  const gap = demand - supply;

  /*
   * Deep floors are automatically more dangerous.
   */

  if (floor >= 6) {
    return "CRITICAL";
  }

  /*
   * High demand gap or deeper floor.
   */

  if (floor >= 3 || gap >= 30) {
    return "ELEVATED";
  }

  return "LOW";
}


/*
 * ============================================================
 * CHALLENGE GENERATOR
 * ============================================================
 *
 * The floor is used as a deterministic seed.
 *
 * Example:
 *
 * Floor 1 → RUN
 * Floor 2 → CATCH
 * Floor 3 → SHOOT
 * Floor 4 → DODGE
 * Floor 5 → MEMORY
 * Floor 6 → STRIKE
 * Floor 7 → AIM
 * Floor 8 → DOOR
 *
 * Then the sequence cycles again.
 *
 * This prevents the challenge from randomly changing every
 * time the API is called for the same floor.
 *
 * ============================================================
 */

function getChallengeForFloor(floor: number) {

  const safeFloor = Math.max(1, floor);


  /*
   * Select challenge type.
   */

  const challengeIndex =
    (safeFloor - 1) % challengeTemplates.length;


  const template =
    challengeTemplates[challengeIndex];


  /*
   * Select title.
   */

  const titleIndex =
    Math.floor(
      (safeFloor - 1) /
      challengeTemplates.length
    ) % template.titles.length;


  /*
   * Select description.
   */

  const descriptionIndex =
    Math.floor(
      (safeFloor - 1) /
      template.titles.length
    ) % template.descriptions.length;


  /*
   * Create challenge.
   */

  return {

    challengeType:
      template.type,

    title:
      template.titles[titleIndex],

    description:
      template.descriptions[
        descriptionIndex
      ],

    difficulty:
      getDifficulty(safeFloor),

    objective:
      getObjective(template.type),

    timeLimit:
      getTimeLimit(
        safeFloor,
        template.type
      ),
  };
}


/*
 * ============================================================
 * OBJECTIVE
 * ============================================================
 */

function getObjective(
  type: ChallengeType
): string {

  switch (type) {

    case "RUN":
      return "Reach the vault gate without hitting an obstacle.";

    case "CATCH":
      return "Catch 5 pieces of treasure.";

    case "SHOOT":
      return "Hit 5 glowing targets.";

    case "DODGE":
      return "Survive the incoming attacks.";

    case "MEMORY":
      return "Remember and reproduce the rune sequence.";

    case "STRIKE":
      return "Hit the correct guardian target.";

    case "AIM":
      return "Hit the moving crystal.";

    case "DOOR":
      return "Choose the correct vault passage.";

    default:
      return "Complete the vault challenge.";
  }
}


/*
 * ============================================================
 * TIME LIMIT
 * ============================================================
 */

function getTimeLimit(
  floor: number,
  type: ChallengeType
): number {

  /*
   * Memory challenges are shorter.
   */

  if (type === "MEMORY") {

    return Math.max(
      4,
      10 - Math.floor(floor / 4)
    );
  }


  /*
   * RUN and DODGE become faster at deeper floors.
   */

  if (
    type === "RUN" ||
    type === "DODGE"
  ) {

    return Math.max(
      6,
      12 - Math.floor(floor / 5)
    );
  }


  /*
   * Other challenges.
   */

  return Math.max(
    8,
    15 - Math.floor(floor / 5)
  );
}


/*
 * ============================================================
 * MARKET STATUS
 * ============================================================
 */

function getMarketStatus(
  demandGap: number
): string {

  if (demandGap >= 30) {
    return "HIGH DEMAND";
  }

  if (demandGap >= 10) {
    return "DEMAND RISING";
  }

  if (demandGap <= -20) {
    return "OVERSUPPLIED";
  }

  return "BALANCED";
}


/*
 * ============================================================
 * RISK NOTE
 * ============================================================
 */

function getRiskNote(
  riskLevel: string
): string {

  if (riskLevel === "ELEVATED") {

    return (
      "Vault exposure is increasing. " +
      "Deeper floors carry greater uncertainty."
    );
  }


  if (riskLevel === "CRITICAL") {

    return (
      "Critical depth reached. Extraction protects " +
      "the current payout while descent exposes the " +
      "wager to greater risk."
    );
  }


  return (
    "The vault remains relatively stable."
  );
}


/*
 * ============================================================
 * PLAYER DECISION MESSAGE
 * ============================================================
 */

function getDecision(
  floor: number
): string {

  if (floor >= 5) {

    return (
      "Deep vault exposure is significant. " +
      "Consider whether the increased payout " +
      "justifies continuing."
    );
  }


  return (
    "The player can extract the current value " +
    "or continue deeper."
  );
}


/*
 * ============================================================
 * SECURITY MESSAGE
 * ============================================================
 */

function getSecurityMessage(): string {

  return (
    "Dragon AI generates challenge information only. " +
    "Chain VRF determines the random game outcome " +
    "and the smart contract remains authoritative " +
    "for settlement."
  );
}


/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {

  try {

    /*
     * --------------------------------------------------------
     * READ REQUEST
     * --------------------------------------------------------
     */

    const body =
      (await request.json()) as DragonAIRequest;


    /*
     * --------------------------------------------------------
     * SANITIZE INPUT
     * --------------------------------------------------------
     */

    const floor =
      Math.max(
        1,
        Number(
          body.floor ?? 1
        )
      );


    const multiplier =
      Number(
        body.multiplier ?? 1
      );


    const supply =
      Number(
        body.supply ?? 42
      );


    const demand =
      Number(
        body.demand ?? 78
      );


    const price =
      Number(
        body.price ?? 850
      );


    const trend =
      body.trend ?? "UP";


    /*
     * --------------------------------------------------------
     * MARKET ANALYSIS
     * --------------------------------------------------------
     */

    const demandGap =
      demand - supply;


    const marketStatus =
      getMarketStatus(
        demandGap
      );


    /*
     * --------------------------------------------------------
     * RISK ANALYSIS
     * --------------------------------------------------------
     */

    const riskLevel =
      getRiskLevel(
        floor,
        demand,
        supply
      );


    const riskNote =
      getRiskNote(
        riskLevel
      );


    /*
     * --------------------------------------------------------
     * PLAYER DECISION INFORMATION
     * --------------------------------------------------------
     */

    const decision =
      getDecision(
        floor
      );


    /*
     * --------------------------------------------------------
     * CHALLENGE GENERATION
     * --------------------------------------------------------
     */

    const challenge =
      getChallengeForFloor(
        floor
      );


    /*
     * --------------------------------------------------------
     * SECURITY
     * --------------------------------------------------------
     *
     * AI never controls the casino result.
     * This is extremely important for the architecture.
     * --------------------------------------------------------
     */

    const security =
      getSecurityMessage();


    /*
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json({

      success: true,


      /*
       * ======================================================
       * DRAGON ECONOMIST
       * ======================================================
       */

      analysis: {

        marketStatus,

        resource:
          "Dragon Crystal",

        price,

        supply,

        demand,

        demandGap,

        trend,

        floor,

        multiplier,

        riskLevel,

        riskNote,

        decision,

        security,
      },


      /*
       * ======================================================
       * DRAGON DUNGEON MASTER
       * ======================================================
       */

      challenge: {

        ...challenge,

        floor,

        message:
          `The Dragon has opened a new challenge for Floor ${floor}.`,
      },


      /*
       * ======================================================
       * AI AGENT INFORMATION
       * ======================================================
       */

      agent: {

        name:
          "Dragon AI",

        roles: [

          "Dragon Economist",

          "Dragon Dungeon Master",

        ],
      },


      /*
       * ======================================================
       * FRONTEND FLAGS
       * ======================================================
       *
       * These make it easier for the frontend to understand
       * what the response represents.
       *
       * ======================================================
       */

      game: {

        playerControlsOutcome:
          true,

        aiControlsOutcome:
          false,

        vrfControlsRandomness:
          true,

        contractControlsSettlement:
          true,

      },

    });

  } catch (error) {

    /*
     * --------------------------------------------------------
     * ERROR LOG
     * --------------------------------------------------------
     */

    console.error(
      "Dragon AI API error:",
      error
    );


    /*
     * --------------------------------------------------------
     * SAFE FALLBACK
     * --------------------------------------------------------
     *
     * If the API receives invalid data or something fails,
     * the game still receives a valid challenge.
     * --------------------------------------------------------
     */

    return NextResponse.json(

      {

        success: false,

        error:
          "Unable to generate Dragon AI analysis.",

        challenge:
          getChallengeForFloor(1),

      },

      {
        status: 500,
      }
    );
  }
}