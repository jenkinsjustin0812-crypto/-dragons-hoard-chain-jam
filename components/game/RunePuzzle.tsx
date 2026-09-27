"use client";

import { useEffect, useMemo, useState } from "react";

interface RunePuzzleProps {
  floor: number;
  onSolved: () => void;
}

type Puzzle = {
  title: string;
  sequence: string;
  question: string;
  options: string[];
  answer: string;
};

function getPuzzle(floor: number): Puzzle {
  const puzzles: Puzzle[] = [
    {
      title: "THE TWIN FLAMES",
      sequence: "▲  ●  ▲  ●  ?",
      question: "Which rune comes next?",
      options: ["▲", "◆", "●", "■"],
      answer: "▲",
    },
    {
      title: "THE DRAGON'S COUNT",
      sequence: "1  →  4  →  9  →  16  →  ?",
      question: "Which number completes the sequence?",
      options: ["20", "24", "25", "32"],
      answer: "25",
    },
    {
      title: "THE GROWING RUNE",
      sequence: "◆  →  ◆◆  →  ◆◆◆  →  ?",
      question: "Which rune follows the pattern?",
      options: ["◆◆", "◆◆◆◆", "◆◆◆◆◆", "●●●●"],
      answer: "◆◆◆◆",
    },
    {
      title: "THE DOUBLING VAULT",
      sequence: "2  →  4  →  8  →  16  →  ?",
      question: "What comes next?",
      options: ["24", "30", "32", "36"],
      answer: "32",
    },
    {
      title: "THE LETTER RUNE",
      sequence: "A  →  C  →  F  →  J  →  ?",
      question: "The jump grows by one each time. Which letter is next?",
      options: ["M", "N", "O", "P"],
      answer: "O",
    },
    {
      title: "THE HUNGRY DRAGON",
      sequence: "3  →  6  →  12  →  24  →  ?",
      question: "What number does the Dragon demand?",
      options: ["36", "42", "48", "54"],
      answer: "48",
    },
    {
      title: "THE SHRINKING HOARD",
      sequence: "81  →  27  →  9  →  3  →  ?",
      question: "What remains after the next division?",
      options: ["0", "1", "2", "3"],
      answer: "1",
    },
  ];

  return puzzles[
    Math.min(Math.max(floor - 1, 0), puzzles.length - 1)
  ];
}

export default function RunePuzzle({
  floor,
  onSolved,
}: RunePuzzleProps) {
  const puzzle = useMemo(
    () => getPuzzle(floor),
    [floor]
  );

  const [selected, setSelected] =
    useState<string | null>(null);

  const [solved, setSolved] =
    useState(false);

  useEffect(() => {
    setSelected(null);
    setSolved(false);
  }, [floor]);

  function choose(option: string) {
    if (solved) return;

    setSelected(option);

    if (option === puzzle.answer) {
      setSolved(true);
      onSolved();
    }
  }

  return (
    <section
      aria-label="Dragon Rune Puzzle"
      style={{
        marginTop: 18,
        padding: 18,
        border:
          "1px solid rgba(214, 168, 73, 0.38)",
        borderRadius: 12,
        background:
          "linear-gradient(180deg, rgba(35,25,15,0.96), rgba(12,10,8,0.98))",
        boxShadow:
          "inset 0 0 30px rgba(214,168,73,0.05)",
      }}
    >
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
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "#cda85b",
              fontWeight: 700,
            }}
          >
            🔐 VAULT RUNE PUZZLE
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 16,
              fontWeight: 700,
              color: "#f2dfb0",
            }}
          >
            {puzzle.title}
          </div>
        </div>

        <span
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            color: solved
              ? "#75d69b"
              : "#c9c0ae",
            border: "1px solid currentColor",
            borderRadius: 999,
            padding: "5px 9px",
          }}
        >
          {solved
            ? "RUNE SOLVED"
            : `FLOOR ${floor}`}
        </span>
      </div>

      <div
        style={{
          padding: "18px 12px",
          textAlign: "center",
          borderRadius: 9,
          background:
            "rgba(0,0,0,0.35)",
          border:
            "1px solid rgba(255,255,255,0.06)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize:
              floor === 3 ? 24 : 28,
            fontWeight: 800,
            letterSpacing: 5,
            color: "#f5e7c1",
            wordBreak: "break-word",
          }}
        >
          {puzzle.sequence}
        </div>

        <div
          style={{
            marginTop: 9,
            fontSize: 12,
            color: "#9f988c",
          }}
        >
          {puzzle.question}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {puzzle.options.map((option) => {
          const isCorrect =
            option === puzzle.answer;

          const isSelected =
            option === selected;

          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              disabled={solved}
              style={{
                minHeight: 48,
                borderRadius: 8,

                border:
                  isCorrect && solved
                    ? "1px solid #75d69b"
                    : isSelected
                    ? "1px solid #a94a42"
                    : "1px solid rgba(214,168,73,0.28)",

                background:
                  isCorrect && solved
                    ? "rgba(55,135,84,0.18)"
                    : isSelected
                    ? "rgba(140,45,38,0.2)"
                    : "rgba(255,255,255,0.025)",

                color:
                  isCorrect && solved
                    ? "#9be8b7"
                    : "#ead9b4",

                cursor: solved
                  ? "default"
                  : "pointer",

                fontWeight: 700,
                fontSize: 14,
                padding: "6px 4px",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 11,
          minHeight: 18,
          textAlign: "center",
          fontSize: 11,
          color: solved
            ? "#75d69b"
            : selected
            ? "#d7867e"
            : "#80786c",
        }}
      >
        {solved
          ? "✓ Rune accepted. The descent path is unlocked."
          : selected
          ? "✕ Wrong rune. Study the sequence and try again."
          : "Solve the rune to unlock DESCEND DEEPER."}
      </div>
    </section>
  );
}
