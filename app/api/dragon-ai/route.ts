import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      floor,
      multiplier,
      supply,
      demand,
      price,
      trend,
    } = body;

    const demandGap = demand - supply;

    let marketStatus = "BALANCED";

    if (demandGap > 25) {
      marketStatus = "STRONG DEMAND";
    } else if (demandGap > 10) {
      marketStatus = "POSITIVE";
    } else if (demandGap < -10) {
      marketStatus = "WEAK DEMAND";
    }

    let riskLevel = "LOW";

    if (floor >= 5) {
      riskLevel = "CRITICAL";
    } else if (floor >= 3) {
      riskLevel = "ELEVATED";
    }

    return NextResponse.json({
      success: true,

      analysis: {
        marketStatus,
        resource: "Dragon Crystal",
        price,
        supply,
        demand,
        demandGap,
        trend,
        floor,
        multiplier,
        riskLevel,
        riskNote:
          "Deeper vault levels increase potential extraction value while exposing the current wager to additional vault risk.",
        decision:
          "The player controls the next action: EXTRACT or DESCEND DEEPER.",
        security:
          "The Dragon Economist provides market information only. Chain VRF determines the random game outcome, while the smart contract remains authoritative for settlement and payout.",
      },
    });
  } catch (error) {
    console.error("Dragon AI error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to analyze the current market.",
      },
      { status: 500 }
    );
  }
}
