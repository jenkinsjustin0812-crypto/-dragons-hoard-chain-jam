"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

/*
 * ============================================================
 * DRAGON'S HOARD — AI VAULT CHALLENGE
 * ============================================================
 *
 * Flow:
 *
 * Floor
 *   ↓
 * Dragon AI API
 *   ↓
 * Challenge generated
 *   ↓
 * Player plays challenge
 *   ↓
 * Challenge completed
 *   ↓
 * onCompleted()
 *
 * IMPORTANT:
 * The challenge itself does NOT decide the casino payout.
 * Chain VRF + the smart contract remain authoritative.
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

interface VaultChallengeProps {
  floor: number;
  onCompleted: () => void;
}

interface AIChallenge {
  challengeType: ChallengeType;
  title: string;
  description: string;
  difficulty: string;
  objective: string;
  timeLimit: number;
  floor: number;
  message: string;
}

interface AIResponse {
  success: boolean;
  challenge?: AIChallenge;
  analysis?: {
    marketStatus: string;
    riskLevel: string;
  };
  error?: string;
}


/*
 * ============================================================
 * FALLBACK CHALLENGE
 * ============================================================
 *
 * If the API is temporarily unavailable, the game still works.
 * ============================================================
 */

function getFallbackChallenge(floor: number): AIChallenge {
  const challenges: AIChallenge[] = [
    {
      challengeType: "RUN",
      title: "THE DRAGON'S RUN",
      description:
        "Move between three lanes and avoid the cursed rocks.",
      difficulty: floor <= 2 ? "EASY" : "HARD",
      objective:
        "Reach the vault gate without hitting an obstacle.",
      timeLimit: 12,
      floor,
      message:
        `The Dragon has opened a new challenge for Floor ${floor}.`,
    },

    {
      challengeType: "CATCH",
      title: "THE FALLING HOARD",
      description:
        "Catch 5 treasures before they escape the vault.",
      difficulty: floor <= 2 ? "EASY" : "HARD",
      objective:
        "Catch 5 pieces of treasure.",
      timeLimit: 15,
      floor,
      message:
        `The Dragon has opened a new challenge for Floor ${floor}.`,
    },

    {
      challengeType: "SHOOT",
      title: "THE DRAGON'S TARGETS",
      description:
        "Hit 5 glowing targets before the vault closes.",
      difficulty: floor <= 2 ? "EASY" : "HARD",
      objective:
        "Hit 5 glowing targets.",
      timeLimit: 15,
      floor,
      message:
        `The Dragon has opened a new challenge for Floor ${floor}.`,
    },
  ];

  return challenges[(Math.max(floor, 1) - 1) % challenges.length];
}


/*
 * ============================================================
 * MAIN COMPONENT
 * ============================================================
 */

export default function VaultChallenge({
  floor,
  onCompleted,
}: VaultChallengeProps) {

  /*
   * ----------------------------------------------------------
   * AI CHALLENGE
   * ----------------------------------------------------------
   */

  const [challenge, setChallenge] =
    useState<AIChallenge | null>(null);

  const [loadingAI, setLoadingAI] =
    useState(true);

  const [aiError, setAIError] =
    useState(false);


  /*
   * ----------------------------------------------------------
   * GENERAL GAME STATE
   * ----------------------------------------------------------
   */

  const [completed, setCompleted] =
    useState(false);

  const [score, setScore] =
    useState(0);

  const [message, setMessage] =
    useState("Dragon AI is preparing the challenge...");


  /*
   * ----------------------------------------------------------
   * RUN / CATCH
   * ----------------------------------------------------------
   */

  const [lane, setLane] =
    useState(1);

  const [runnerX, setRunnerX] =
    useState(50);

  const [fallingX, setFallingX] =
    useState(50);

  const [fallingY, setFallingY] =
    useState(0);


  /*
   * ----------------------------------------------------------
   * SHOOT / AIM
   * ----------------------------------------------------------
   */

  const [targetX, setTargetX] =
    useState(50);

  const [targetY, setTargetY] =
    useState(35);


  /*
   * ----------------------------------------------------------
   * DODGE
   * ----------------------------------------------------------
   */

  const [fireballX, setFireballX] =
    useState(50);

  const [fireballY, setFireballY] =
    useState(0);

  const [dodgeLane, setDodgeLane] =
    useState(1);

  const [dodgeHits, setDodgeHits] =
    useState(0);


  /*
   * ----------------------------------------------------------
   * MEMORY
   * ----------------------------------------------------------
   */

  const [memorySequence, setMemorySequence] =
    useState<number[]>([]);

  const [memoryInput, setMemoryInput] =
    useState<number[]>([]);

  const [showMemory, setShowMemory] =
    useState(true);


  /*
   * ----------------------------------------------------------
   * STRIKE
   * ----------------------------------------------------------
   */

  const [strikeTarget, setStrikeTarget] =
    useState(1);


  /*
   * ----------------------------------------------------------
   * DOOR
   * ----------------------------------------------------------
   */

  const [correctDoor, setCorrectDoor] =
    useState(1);

  const [doorAttempts, setDoorAttempts] =
    useState(0);


  /*
   * ==========================================================
   * LOAD DRAGON AI
   * ==========================================================
   */

  useEffect(() => {

    let cancelled = false;

    async function loadChallenge() {

      setLoadingAI(true);
      setAIError(false);
      setCompleted(false);
      setScore(0);

      setMessage(
        "🐉 Dragon AI is designing your vault challenge..."
      );

      try {

        const response =
          await fetch("/api/dragon-ai", {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              floor,
              multiplier: 1,
              supply: 42,
              demand: 78,
              price: 850,
              trend: "UP",
            }),
          });


        if (!response.ok) {
          throw new Error(
            "Dragon AI request failed."
          );
        }


        const data =
          (await response.json()) as AIResponse;


        if (
          !data.success ||
          !data.challenge
        ) {
          throw new Error(
            data.error ||
            "No challenge returned."
          );
        }


        if (cancelled) return;


        setChallenge(data.challenge);

        setMessage(
          data.challenge.message ||
          "Challenge ready."
        );

      } catch (error) {

        console.error(
          "Dragon AI challenge error:",
          error
        );


        if (cancelled) return;


        /*
         * Safe fallback.
         */

        setAIError(true);

        setChallenge(
          getFallbackChallenge(floor)
        );

        setMessage(
          "Dragon AI unavailable — fallback challenge loaded."
        );

      } finally {

        if (!cancelled) {
          setLoadingAI(false);
        }
      }
    }


    loadChallenge();


    return () => {
      cancelled = true;
    };

  }, [floor]);


  /*
   * ==========================================================
   * FINISH CHALLENGE
   * ==========================================================
   */

  const finish = useCallback(() => {

    setCompleted(true);

    setMessage(
      "✓ Vault challenge cleared. Descent unlocked."
    );

    onCompleted();

  }, [onCompleted]);


  /*
   * ==========================================================
   * RESET GAME VARIABLES WHEN FLOOR CHANGES
   * ==========================================================
   */

  useEffect(() => {

    setCompleted(false);
    setScore(0);

    setLane(1);
    setRunnerX(50);

    setFallingX(50);
    setFallingY(0);

    setTargetX(50);
    setTargetY(35);

    setFireballX(50);
    setFireballY(0);

    setDodgeLane(1);
    setDodgeHits(0);

    setMemorySequence([]);
    setMemoryInput([]);
    setShowMemory(true);

    setStrikeTarget(1);

    setCorrectDoor(
      (floor % 3) + 1
    );

    setDoorAttempts(0);

  }, [floor]);


  /*
   * ==========================================================
   * RUN KEYBOARD CONTROLS
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "RUN" ||
      completed
    ) {
      return;
    }


    function onKeyDown(
      event: KeyboardEvent
    ) {

      if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
      ) {

        setLane(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      }


      if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
      ) {

        setLane(
          (current) =>
            Math.min(
              2,
              current + 1
            )
        );
      }
    }


    window.addEventListener(
      "keydown",
      onKeyDown
    );


    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };

  }, [
    challenge?.challengeType,
    completed,
  ]);


  /*
   * ==========================================================
   * RUN POSITION
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "RUN"
    ) {
      return;
    }

    setRunnerX(
      25 + lane * 25
    );

  }, [
    challenge?.challengeType,
    lane,
  ]);


  /*
   * ==========================================================
   * RUN AUTO COMPLETION
   * ==========================================================
   *
   * For the prototype, the player reaches the gate by
   * surviving long enough.
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "RUN" ||
      completed ||
      loadingAI
    ) {
      return;
    }


    const timer =
      window.setTimeout(() => {

        finish();

      }, Math.max(
        4000,
        challenge.timeLimit * 500
      ));


    return () =>
      window.clearTimeout(timer);

  }, [
    challenge,
    completed,
    loadingAI,
    finish,
  ]);


  /*
   * ==========================================================
   * CATCH GAME
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "CATCH" ||
      completed ||
      loadingAI
    ) {
      return;
    }


    const timer =
      window.setInterval(() => {

        setFallingY((y) => {

          const next =
            y + 7;


          if (next >= 84) {

            const caught =
              Math.abs(
                runnerX - fallingX
              ) < 14;


            if (caught) {

              setScore(
                (current) => {

                  const nextScore =
                    current + 1;


                  if (
                    nextScore >= 5
                  ) {
                    finish();
                  }


                  return nextScore;
                }
              );


              setMessage(
                "💰 Treasure caught!"
              );

            } else {

              setMessage(
                "Missed it — keep moving."
              );
            }


            setFallingX(
              12 +
              Math.random() * 76
            );


            return 0;
          }


          return next;
        });

      }, 250);


    return () =>
      window.clearInterval(timer);

  }, [
    challenge?.challengeType,
    completed,
    fallingX,
    finish,
    loadingAI,
    runnerX,
  ]);


  /*
   * ==========================================================
   * SHOOT
   * ==========================================================
   */

  function shoot() {

    if (completed) return;


    const hit =
      Math.abs(
        runnerX - targetX
      ) < 25 &&
      Math.abs(
        50 - targetY
      ) < 35;


    if (!hit) {

      setMessage(
        "Missed. Aim for the glowing target."
      );

      return;
    }


    setScore(
      (current) => {

        const nextScore =
          current + 1;


        if (
          nextScore >= 5
        ) {
          finish();
        }


        return nextScore;
      }
    );


    setTargetX(
      12 +
      Math.random() * 76
    );


    setTargetY(
      20 +
      Math.random() * 55
    );


    setMessage(
      "🎯 Direct hit!"
    );
  }


  /*
   * ==========================================================
   * AIM
   * ==========================================================
   */

  function aimShoot() {

    if (completed) return;


    const hit =
      Math.abs(
        runnerX - targetX
      ) < 18;


    if (!hit) {

      setMessage(
        "❌ Missed. Wait for the crystal alignment."
      );

      return;
    }


    setScore(
      (current) => {

        const nextScore =
          current + 1;


        if (
          nextScore >= 3
        ) {
          finish();
        }


        return nextScore;
      }
    );


    setTargetX(
      15 +
      Math.random() * 70
    );


    setMessage(
      "💎 Crystal struck!"
    );
  }


  /*
   * ==========================================================
   * DODGE
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "DODGE" ||
      completed ||
      loadingAI
    ) {
      return;
    }


    const timer =
      window.setInterval(() => {

        setFireballY((y) => {

          const next =
            y + 8;


          if (next >= 84) {

            const fireLane =
              Math.floor(
                Math.random() * 3
              );


            const playerLane =
              dodgeLane;


            if (
              fireLane === playerLane
            ) {

              setDodgeHits(
                (current) => {

                  const nextHits =
                    current + 1;


                  if (
                    nextHits >= 3
                  ) {

                    setMessage(
                      "🔥 You were hit too many times."
                    );

                  }


                  return nextHits;
                }
              );


            } else {

              setScore(
                (current) =>
                  current + 1
              );

              setMessage(
                "🔥 Fireball dodged!"
              );
            }


            setFireballX(
              20 +
              fireLane * 30
            );


            return 0;
          }


          return next;
        });

      }, 300);


    return () =>
      window.clearInterval(timer);

  }, [
    challenge?.challengeType,
    completed,
    dodgeLane,
    loadingAI,
  ]);


  /*
   * ==========================================================
   * DODGE KEYBOARD
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "DODGE" ||
      completed
    ) {
      return;
    }


    function onKeyDown(
      event: KeyboardEvent
    ) {

      if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
      ) {

        setDodgeLane(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      }


      if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
      ) {

        setDodgeLane(
          (current) =>
            Math.min(
              2,
              current + 1
            )
        );
      }
    }


    window.addEventListener(
      "keydown",
      onKeyDown
    );


    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );

  }, [
    challenge?.challengeType,
    completed,
  ]);


  /*
   * ==========================================================
   * DODGE COMPLETION
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "DODGE" ||
      completed ||
      loadingAI
    ) {
      return;
    }


    const timer =
      window.setTimeout(() => {

        if (dodgeHits < 3) {
          finish();
        }

      }, Math.max(
        5000,
        challenge.timeLimit * 500
      ));


    return () =>
      window.clearTimeout(timer);

  }, [
    challenge,
    completed,
    dodgeHits,
    finish,
    loadingAI,
  ]);


  /*
   * ==========================================================
   * MEMORY SETUP
   * ==========================================================
   */

  useEffect(() => {

    if (
      challenge?.challengeType !== "MEMORY" ||
      loadingAI
    ) {
      return;
    }


    const length =
      Math.min(
        5,
        3 +
        Math.floor(
          Math.max(
            0,
            floor - 1
          ) / 3
        )
      );


    const sequence =
      Array.from(
        { length },
        () =>
          1 +
          Math.floor(
            Math.random() * 4
          )
      );


    setMemorySequence(
      sequence
    );

    setMemoryInput([]);
    setShowMemory(true);


    const timer =
      window.setTimeout(() => {

        setShowMemory(false);

        setMessage(
          "The runes have vanished. Reproduce the sequence."
        );

      }, 2200);


    return () =>
      window.clearTimeout(timer);

  }, [
    challenge?.challengeType,
    floor,
    loadingAI,
  ]);


  /*
   * ==========================================================
   * MEMORY INPUT
   * ==========================================================
   */

  function pressMemoryRune(
    value: number
  ) {

    if (
      completed ||
      showMemory
    ) {
      return;
    }


    const nextInput = [
      ...memoryInput,
      value,
    ];


    const index =
      nextInput.length - 1;


    if (
      memorySequence[index] !== value
    ) {

      setMessage(
        "❌ Wrong rune. The vault rejects your sequence."
      );

      setMemoryInput([]);

      return;
    }


    setMemoryInput(
      nextInput
    );


    if (
      nextInput.length ===
      memorySequence.length
    ) {

      setMessage(
        "🧠 Ancient sequence restored!"
      );

      finish();
    }
  }


  /*
   * ==========================================================
   * STRIKE
   * ==========================================================
   */

  function strike(
    target: number
  ) {

    if (completed) return;


    if (
      target === strikeTarget
    ) {

      setMessage(
        "⚔️ Perfect strike!"
      );

      finish();

    } else {

      setMessage(
        "❌ The guardian blocked your strike."
      );

      /*
       * Move the correct target.
       */

      setStrikeTarget(
        1 +
        Math.floor(
          Math.random() * 3
        )
      );
    }
  }


  /*
   * ==========================================================
   * DOOR
   * ==========================================================
   */

  function chooseDoor(
    door: number
  ) {

    if (completed) return;


    setDoorAttempts(
      (current) =>
        current + 1
    );


    if (
      door === correctDoor
    ) {

      setMessage(
        "🚪 The hidden passage opens!"
      );

      finish();

    } else {

      setMessage(
        "❌ Wrong gate. The dragon rejects your choice."
      );


      /*
       * Change the safe door.
       */

      setCorrectDoor(
        1 +
        Math.floor(
          Math.random() * 3
        )
      );
    }
  }


  /*
   * ==========================================================
   * RUN BUTTONS
   * ==========================================================
   */

  function moveLeft() {

    if (completed) return;

    setLane(
      (current) =>
        Math.max(
          0,
          current - 1
        )
    );
  }


  function moveRight() {

    if (completed) return;

    setLane(
      (current) =>
        Math.min(
          2,
          current + 1
        )
    );
  }


  /*
   * ==========================================================
   * AI LOADING SCREEN
   * ==========================================================
   */

  if (
    loadingAI ||
    !challenge
  ) {

    return (
      <section
        aria-label="Dragon AI Vault Challenge"
        style={panelStyle}
      >

        <div
          style={{
            textAlign: "center",
            padding: 35,
          }}
        >

          <div
            style={{
              fontSize: 38,
              marginBottom: 12,
              animation:
                "dragonPulse 1.2s ease-in-out infinite",
            }}
          >
            🐉
          </div>


          <div
            style={labelStyle}
          >
            DRAGON AI
          </div>


          <h3
            style={{
              margin: "7px 0",
              color: "#f2dfb0",
              fontSize: 18,
            }}
          >
            Designing Floor {floor}
          </h3>


          <p
            style={{
              margin: 0,
              color: "#9f988c",
              fontSize: 12,
            }}
          >
            The Dragon Dungeon Master is preparing
            your challenge...
          </p>

        </div>


        <style jsx>{`
          @keyframes dragonPulse {
            0% {
              transform: scale(1);
              opacity: 0.65;
            }

            50% {
              transform: scale(1.15);
              opacity: 1;
            }

            100% {
              transform: scale(1);
              opacity: 0.65;
            }
          }
        `}</style>

      </section>
    );
  }


  /*
   * ==========================================================
   * MAIN UI
   * ==========================================================
   */

  return (
    <section
      aria-label="AI Vault Challenge"
      style={panelStyle}
    >

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >

        <div>

          <div
            style={labelStyle}
          >
            🐉 DRAGON AI · DUNGEON MASTER
          </div>


          <h3
            style={{
              margin: "5px 0 0",
              color: "#f2dfb0",
              fontSize: 17,
            }}
          >
            {challenge.title}
          </h3>

        </div>


        <span
          style={{
            border:
              "1px solid rgba(214,168,73,0.35)",
            borderRadius: 999,
            padding: "5px 9px",
            fontSize: 10,
            letterSpacing: 1,
            color:
              completed
                ? "#8ee3aa"
                : "#bdb3a1",
          }}
        >
          FLOOR {floor}
        </span>

      </div>


      {/* =====================================================
          CHALLENGE INFORMATION
          ===================================================== */}

      <p
        style={{
          margin: "0 0 8px",
          color: "#9f988c",
          fontSize: 12,
        }}
      >
        {challenge.description}
      </p>


      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          marginBottom: 12,
        }}
      >

        <InfoBadge>
          {challenge.challengeType}
        </InfoBadge>


        <InfoBadge>
          {challenge.difficulty}
        </InfoBadge>


        <InfoBadge>
          {challenge.timeLimit}s
        </InfoBadge>

      </div>


      <div
        style={{
          padding:
            "8px 10px",
          marginBottom: 12,
          border:
            "1px solid rgba(214,168,73,0.14)",
          borderRadius: 7,
          color: "#c7bda9",
          fontSize: 11,
          background:
            "rgba(214,168,73,0.035)",
        }}
      >
        <strong
          style={{
            color: "#d6a849",
          }}
        >
          OBJECTIVE:
        </strong>{" "}
        {challenge.objective}
      </div>


      {/* =====================================================
          GAME AREA
          ===================================================== */}

      <div
        style={gameAreaStyle}
      >

        {/* ===================================================
            RUN
            =================================================== */}

        {challenge.challengeType === "RUN" && (
          <>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
              }}
            >

              {[0, 1, 2].map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      borderLeft:
                        item === 0
                          ? "none"
                          : "1px dashed rgba(214,168,73,0.14)",
                    }}
                  />
                )
              )}

            </div>


            <div
              style={{
                position: "absolute",
                top: 35,
                left: "20%",
                fontSize: 26,
                opacity: 0.7,
              }}
            >
              🪨
            </div>


            <div
              style={{
                position: "absolute",
                top: 85,
                left: "63%",
                fontSize: 26,
                opacity: 0.7,
              }}
            >
              🪨
            </div>


            <div
              style={{
                position: "absolute",
                top: 20,
                left: "78%",
                fontSize: 22,
              }}
            >
              💰
            </div>


            <div
              style={{
                position: "absolute",
                bottom: 25,
                left: `${runnerX}%`,
                transform:
                  "translateX(-50%)",
                fontSize: 34,
                transition:
                  "left 0.18s ease",
              }}
            >
              🧍
            </div>


            <div
              style={{
                position: "absolute",
                bottom: 7,
                left: "50%",
                transform:
                  "translateX(-50%)",
                color: "#8e8679",
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              ← A / D → OR ARROW KEYS
            </div>


            <ChallengeControlButtons
              onLeft={moveLeft}
              onRight={moveRight}
              disabled={completed}
            />

          </>
        )}


        {/* ===================================================
            CATCH
            =================================================== */}

        {challenge.challengeType === "CATCH" && (
          <>

            <div
              style={{
                position: "absolute",
                left: `${fallingX}%`,
                top: `${fallingY}%`,
                transform:
                  "translate(-50%, -50%)",
                fontSize: 28,
                transition:
                  "top 0.12s linear",
              }}
            >
              💎
            </div>


            <div
              style={{
                position: "absolute",
                left: `${runnerX}%`,
                bottom: 20,
                transform:
                  "translateX(-50%)",
                fontSize: 38,
                transition:
                  "left 0.18s ease",
              }}
            >
              🧺
            </div>


            <GameCounter>
              CATCH {score}/5 TREASURES
            </GameCounter>


            <ChallengeControlButtons
              onLeft={() =>
                setRunnerX(
                  (x) =>
                    Math.max(
                      10,
                      x - 12
                    )
                )
              }
              onRight={() =>
                setRunnerX(
                  (x) =>
                    Math.min(
                      90,
                      x + 12
                    )
                )
              }
              disabled={completed}
            />

          </>
        )}


        {/* ===================================================
            SHOOT
            =================================================== */}

        {challenge.challengeType === "SHOOT" && (
          <>

            <button
              type="button"
              aria-label="Shoot target"
              onClick={shoot}
              disabled={completed}
              style={{
                position: "absolute",
                left: `${targetX}%`,
                top: `${targetY}%`,
                transform:
                  "translate(-50%, -50%)",
                width: 62,
                height: 62,
                borderRadius: "50%",
                border:
                  "2px solid #d6a849",
                background:
                  "rgba(120,30,20,0.25)",
                color: "#f5e7c1",
                fontSize: 28,
                cursor:
                  completed
                    ? "default"
                    : "crosshair",
                boxShadow:
                  "0 0 24px rgba(214,168,73,0.3)",
              }}
            >
              🎯
            </button>


            <GameCounter>
              SHOOT {score}/5 TARGETS
            </GameCounter>


            <BottomHint>
              CLICK THE TARGET
            </BottomHint>

          </>
        )}


        {/* ===================================================
            DODGE
            =================================================== */}

        {challenge.challengeType === "DODGE" && (
          <>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
              }}
            >

              {[0, 1, 2].map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      borderLeft:
                        item === 0
                          ? "none"
                          : "1px dashed rgba(214,168,73,0.14)",
                    }}
                  />
                )
              )}

            </div>


            <div
              style={{
                position: "absolute",
                left: `${fireballX}%`,
                top: `${fireballY}%`,
                transform:
                  "translate(-50%, -50%)",
                fontSize: 30,
              }}
            >
              🔥
            </div>


            <div
              style={{
                position: "absolute",
                bottom: 25,
                left:
                  `${25 + dodgeLane * 25}%`,
                transform:
                  "translateX(-50%)",
                fontSize: 34,
                transition:
                  "left 0.18s ease",
              }}
            >
              🧍
            </div>


            <GameCounter>
              FIRE HITS: {dodgeHits}/3
            </GameCounter>


            <ChallengeControlButtons
              onLeft={() =>
                setDodgeLane(
                  (current) =>
                    Math.max(
                      0,
                      current - 1
                    )
                )
              }
              onRight={() =>
                setDodgeLane(
                  (current) =>
                    Math.min(
                      2,
                      current + 1
                    )
                )
              }
              disabled={completed}
            />


            <BottomHint>
              DODGE THE FIRE
            </BottomHint>

          </>
        )}


        {/* ===================================================
            MEMORY
            =================================================== */}

        {challenge.challengeType === "MEMORY" && (
          <>

            <div
              style={{
                position: "absolute",
                top: 15,
                left: "50%",
                transform:
                  "translateX(-50%)",
                color: "#cda85b",
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {showMemory
                ? "MEMORIZE THE RUNE SEQUENCE"
                : "REPEAT THE SEQUENCE"}
            </div>


            <div
              style={{
                position: "absolute",
                top: 55,
                left: "50%",
                transform:
                  "translateX(-50%)",
                display: "flex",
                gap: 8,
              }}
            >

              {memorySequence.map(
                (value, index) => (
                  <div
                    key={index}
                    style={{
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      border:
                        "1px solid rgba(214,168,73,0.45)",
                      borderRadius: 8,
                      color:
                        showMemory
                          ? "#f2dfb0"
                          : "#30291f",
                      background:
                        showMemory
                          ? "rgba(214,168,73,0.15)"
                          : "rgba(0,0,0,0.4)",
                      fontSize: 20,
                    }}
                  >
                    {showMemory
                      ? runeSymbol(value)
                      : "?"}
                  </div>
                )
              )}

            </div>


            {!showMemory && (
              <div
                style={{
                  position: "absolute",
                  bottom: 25,
                  left: "50%",
                  transform:
                    "translateX(-50%)",
                  display: "flex",
                  gap: 7,
                }}
              >

                {[1, 2, 3, 4].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        pressMemoryRune(
                          value
                        )
                      }
                      disabled={completed}
                      style={runeButtonStyle}
                    >
                      {runeSymbol(value)}
                    </button>
                  )
                )}

              </div>
            )}

          </>
        )}


        {/* ===================================================
            STRIKE
            =================================================== */}

        {challenge.challengeType === "STRIKE" && (
          <>

            <div
              style={{
                position: "absolute",
                top: 25,
                left: "50%",
                transform:
                  "translateX(-50%)",
                fontSize: 52,
              }}
            >
              🐉
            </div>


            <div
              style={{
                position: "absolute",
                bottom: 35,
                left: "50%",
                transform:
                  "translateX(-50%)",
                display: "flex",
                gap: 10,
              }}
            >

              {[1, 2, 3].map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      strike(value)
                    }
                    disabled={completed}
                    style={strikeButtonStyle}
                  >
                    ⚔️
                    <span>
                      {value}
                    </span>
                  </button>
                )
              )}

            </div>


            <BottomHint>
              STRIKE THE WEAK POINT
            </BottomHint>

          </>
        )}


        {/* ===================================================
            AIM
            =================================================== */}

        {challenge.challengeType === "AIM" && (
          <>

            <div
              style={{
                position: "absolute",
                left: `${targetX}%`,
                top: "45%",
                transform:
                  "translate(-50%, -50%)",
                fontSize: 40,
                transition:
                  "left 0.2s ease",
              }}
            >
              💎
            </div>


            <button
              type="button"
              onClick={aimShoot}
              disabled={completed}
              style={{
                position: "absolute",
                bottom: 25,
                left: "50%",
                transform:
                  "translateX(-50%)",
                minWidth: 130,
                minHeight: 42,
                borderRadius: 8,
                border:
                  "1px solid rgba(214,168,73,0.45)",
                background:
                  "rgba(214,168,73,0.08)",
                color: "#f2dfb0",
                fontWeight: 800,
                cursor:
                  completed
                    ? "default"
                    : "crosshair",
              }}
            >
              🎯 FIRE
            </button>


            <GameCounter>
              CRYSTAL HITS: {score}/3
            </GameCounter>

          </>
        )}


        {/* ===================================================
            DOOR
            =================================================== */}

        {challenge.challengeType === "DOOR" && (
          <>

            <div
              style={{
                position: "absolute",
                top: 18,
                left: "50%",
                transform:
                  "translateX(-50%)",
                color: "#cda85b",
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              CHOOSE YOUR PASSAGE
            </div>


            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform:
                  "translate(-50%, -45%)",
                display: "flex",
                gap: 12,
              }}
            >

              {[1, 2, 3].map(
                (door) => (
                  <button
                    key={door}
                    type="button"
                    onClick={() =>
                      chooseDoor(
                        door
                      )
                    }
                    disabled={completed}
                    style={doorButtonStyle}
                  >
                    🚪
                    <span>
                      GATE {door}
                    </span>
                  </button>
                )
              )}

            </div>


            <BottomHint>
              {doorAttempts > 0
                ? "THE DRAGON HAS SHUFFLED THE PASSAGE"
                : "ONLY ONE GATE LEADS DEEPER"}
            </BottomHint>

          </>
        )}

      </div>


      {/* =====================================================
          STATUS
          ===================================================== */}

      <div
        style={{
          marginTop: 10,
          minHeight: 18,
          textAlign: "center",
          color:
            completed
              ? "#8ee3aa"
              : "#a39b8e",
          fontSize: 11,
        }}
      >
        {completed
          ? "✓ Challenge completed — you may descend."
          : message}
      </div>


      {/* =====================================================
          AI FALLBACK NOTICE
          ===================================================== */}

      {aiError && (
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
            fontSize: 9,
            color: "#8e8679",
          }}
        >
          Dragon AI connection unavailable. Local challenge
          protocol active.
        </div>
      )}


      {/* =====================================================
          ANIMATION
          ===================================================== */}

      <style jsx>{`

        @keyframes dragonFloat {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-4px);
          }

          100% {
            transform: translateY(0px);
          }
        }

      `}</style>

    </section>
  );
}


/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function InfoBadge({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <span
      style={{
        padding:
          "4px 8px",
        border:
          "1px solid rgba(214,168,73,0.25)",
        borderRadius: 999,
        color: "#bdb3a1",
        fontSize: 9,
        letterSpacing: 0.8,
      }}
    >
      {children}
    </span>
  );
}


function GameCounter({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        color: "#cda85b",
        fontSize: 11,
      }}
    >
      {children}
    </div>
  );
}


function BottomHint({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div
      style={{
        position: "absolute",
        bottom: 9,
        left: "50%",
        transform:
          "translateX(-50%)",
        color: "#8e8679",
        fontSize: 10,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}


/*
 * ============================================================
 * MOVEMENT BUTTONS
 * ============================================================
 */

function ChallengeControlButtons({
  onLeft,
  onRight,
  disabled,
}: {
  onLeft: () => void;
  onRight: () => void;
  disabled: boolean;
}) {

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform:
          "translateX(-50%)",
        display: "flex",
        gap: 8,
      }}
    >

      <button
        type="button"
        onClick={onLeft}
        disabled={disabled}
        style={controlStyle}
      >
        ←
      </button>


      <button
        type="button"
        onClick={onRight}
        disabled={disabled}
        style={controlStyle}
      >
        →
      </button>

    </div>
  );
}


/*
 * ============================================================
 * RUNE SYMBOL
 * ============================================================
 */

function runeSymbol(
  value: number
): string {

  const symbols = [
    "",
    "☿",
    "♄",
    "♆",
    "♃",
  ];

  return (
    symbols[value] ??
    "◆"
  );
}


/*
 * ============================================================
 * PANEL STYLE
 * ============================================================
 */

const panelStyle: CSSProperties = {

  marginTop: 18,

  padding: 18,

  border:
    "1px solid rgba(214,168,73,0.38)",

  borderRadius: 12,

  background:
    "linear-gradient(180deg, rgba(30,22,14,0.98), rgba(9,8,7,0.98))",

  boxShadow:
    "inset 0 0 30px rgba(214,168,73,0.05)",
};


/*
 * ============================================================
 * GAME AREA STYLE
 * ============================================================
 */

const gameAreaStyle: CSSProperties = {

  position: "relative",

  height: 230,

  overflow: "hidden",

  borderRadius: 10,

  border:
    "1px solid rgba(255,255,255,0.07)",

  background:
    "radial-gradient(circle at 50% 20%, rgba(120,75,30,0.18), transparent 45%), #080706",
};


/*
 * ============================================================
 * LABEL STYLE
 * ============================================================
 */

const labelStyle: CSSProperties = {

  fontSize: 10,

  letterSpacing: 2,

  color: "#cda85b",

  fontWeight: 700,
};


/*
 * ============================================================
 * CONTROL BUTTON
 * ============================================================
 */

const controlStyle: CSSProperties = {

  minWidth: 52,

  minHeight: 38,

  borderRadius: 8,

  border:
    "1px solid rgba(214,168,73,0.35)",

  background:
    "rgba(255,255,255,0.03)",

  color: "#ead9b4",

  fontWeight: 700,

  cursor: "pointer",
};


/*
 * ============================================================
 * RUNE BUTTON
 * ============================================================
 */

const runeButtonStyle: CSSProperties = {

  width: 48,

  height: 48,

  borderRadius: 8,

  border:
    "1px solid rgba(214,168,73,0.35)",

  background:
    "rgba(214,168,73,0.08)",

  color: "#f2dfb0",

  fontSize: 20,

  cursor: "pointer",
};


/*
 * ============================================================
 * STRIKE BUTTON
 * ============================================================
 */

const strikeButtonStyle: CSSProperties = {

  width: 62,

  height: 62,

  display: "flex",

  flexDirection: "column",

  alignItems: "center",

  justifyContent: "center",

  gap: 3,

  borderRadius: 9,

  border:
    "1px solid rgba(214,168,73,0.35)",

  background:
    "rgba(120,30,20,0.18)",

  color: "#f2dfb0",

  fontSize: 20,

  cursor: "pointer",
};


/*
 * ============================================================
 * DOOR BUTTON
 * ============================================================
 */

const doorButtonStyle: CSSProperties = {

  width: 82,

  height: 120,

  display: "flex",

  flexDirection: "column",

  alignItems: "center",

  justifyContent: "center",

  gap: 8,

  borderRadius: 9,

  border:
    "1px solid rgba(214,168,73,0.35)",

  background:
    "linear-gradient(180deg, rgba(80,45,20,0.35), rgba(10,8,6,0.9))",

  color: "#f2dfb0",

  fontSize: 25,

  cursor: "pointer",
};