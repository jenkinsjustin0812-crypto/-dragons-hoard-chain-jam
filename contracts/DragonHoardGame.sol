// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/casino-sdk/simulator/contracts/ICasinoGameV2.sol";

contract DragonHoardGame is ICasinoGameV2 {
    uint256 internal constant WAD = 1e18;

    // Multipliers are expressed in basis points.
    // 11500 = 1.15x, 13200 = 1.32x, etc.
    uint256[7] internal FLOOR_MULTIPLIERS = [
        uint256(11500),
        13200,
        15200,
        17600,
        20500,
        24000,
        28500
    ];

    // Safe probabilities chosen so each optional descent
    // has approximately 95% theoretical return.
    uint256[7] internal FLOOR_SAFE_PROBABILITIES = [
        uint256(826086956521739130),
        719696969696969696,
        625000000000000000,
        539772727272727272,
        463414634146341463,
        395833333333333333,
        333333333333333333
    ];

    /*
        gameState encoding:

        uint8   floor
        uint256 currentPayout
        bool    active
    */

    function quoteCaps(
        uint256 wager,
        bytes calldata
    )
        external
        pure
        override
        returns (
            uint256 maxEscrowStake,
            uint256 maxReservedProfit
        )
    {
        uint256 maxPayout = (wager * 28500) / 10000;

        maxEscrowStake = wager;
        maxReservedProfit = maxPayout > wager
            ? maxPayout - wager
            : 0;
    }

    function quoteRiskParams(
        uint256 wager,
        bytes calldata
    )
        external
        pure
        override
        returns (
            uint256 maxPayout,
            uint256 probabilityWad,
            uint256 expectedPayout,
            uint256 bodyVarianceScaled
        )
    {
        maxPayout = (wager * 28500) / 10000;

        // Approximate probability of reaching the deepest floor.
        probabilityWad =
            (826086956521739130 *
            719696969696969696) / WAD;

        probabilityWad =
            (probabilityWad *
            625000000000000000) / WAD;

        probabilityWad =
            (probabilityWad *
            539772727272727272) / WAD;

        probabilityWad =
            (probabilityWad *
            463414634146341463) / WAD;

        probabilityWad =
            (probabilityWad *
            395833333333333333) / WAD;

        probabilityWad =
            (probabilityWad *
            333333333333333333) / WAD;

        expectedPayout =
            (maxPayout * probabilityWad) / WAD;

        bodyVarianceScaled =
            maxPayout * maxPayout;
    }

    function onSessionStart(
        SessionContext calldata ctx
    )
        external
        pure
        override
        returns (StepResult memory result)
    {
        result.newGameState = abi.encode(
            uint8(0),
            ctx.wagerBase,
            true
        );

        result.escrowDelta = 0;
        result.reservedProfitDelta = 0;

        // Player must choose DESCEND or EXTRACT.
        result.nextPhase =
            SessionPhase.WAITING_PLAYER_ACTION;

        result.requestRandomnessNow = false;
        result.payout = 0;
    }

    function onPlayerAction(
        SessionContext calldata ctx,
        bytes calldata actionData
    )
        external
        view
        override
        returns (StepResult memory result)
    {
        (
            uint8 floor,
            uint256 currentPayout,
            bool active
        ) = abi.decode(
            ctx.gameState,
            (uint8, uint256, bool)
        );

        require(active, "DragonHoard: inactive");
        require(actionData.length == 1, "DragonHoard: bad action");

        uint8 action = uint8(actionData[0]);

        // ACTION 1 = EXTRACT
        if (action == 1) {
            result.newGameState = abi.encode(
                floor,
                currentPayout,
                false
            );

            result.escrowDelta = 0;
            result.reservedProfitDelta = 0;
            result.nextPhase = SessionPhase.SETTLED;
            result.requestRandomnessNow = false;
            result.payout = currentPayout;

            return result;
        }

        // ACTION 0 = DESCEND
        require(action == 0, "DragonHoard: invalid action");

        require(
            floor < FLOOR_MULTIPLIERS.length,
            "DragonHoard: deepest floor"
        );

        uint8 nextFloor = floor + 1;

        uint256 nextPayout =
            (ctx.wagerBase *
                FLOOR_MULTIPLIERS[nextFloor - 1]) /
            10000;

        result.newGameState = abi.encode(
            nextFloor,
            nextPayout,
            true
        );

        result.escrowDelta = 0;
        result.reservedProfitDelta = 0;

        // DESCEND triggers Chain VRF.
        result.nextPhase =
            SessionPhase.WAITING_RANDOMNESS;

        result.requestRandomnessNow = true;
        result.payout = 0;
    }

    function onRandomness(
        SessionContext calldata ctx,
        bytes32 randomness
    )
        external
        view
        override
        returns (StepResult memory result)
    {
        (
            uint8 floor,
            uint256 currentPayout,
            bool active
        ) = abi.decode(
            ctx.gameState,
            (uint8, uint256, bool)
        );

        require(active, "DragonHoard: inactive");
        require(floor > 0, "DragonHoard: invalid floor");
        require(
            floor <= FLOOR_SAFE_PROBABILITIES.length,
            "DragonHoard: invalid floor"
        );

        uint256 safeProbability =
            FLOOR_SAFE_PROBABILITIES[floor - 1];

        uint256 roll =
            uint256(randomness) % WAD;

        // SAFE
        if (roll < safeProbability) {
            result.newGameState = abi.encode(
                floor,
                currentPayout,
                true
            );

            result.escrowDelta = 0;
            result.reservedProfitDelta = 0;

            if (floor == FLOOR_MULTIPLIERS.length) {
                result.nextPhase =
                    SessionPhase.SETTLED;

                result.requestRandomnessNow = false;
                result.payout = currentPayout;
            } else {
                result.nextPhase =
                    SessionPhase.WAITING_PLAYER_ACTION;

                result.requestRandomnessNow = false;
                result.payout = 0;
            }

            return result;
        }

        // TRAP
        result.newGameState = abi.encode(
            floor,
            uint256(0),
            false
        );

        result.escrowDelta = 0;
        result.reservedProfitDelta = 0;
        result.nextPhase = SessionPhase.SETTLED;
        result.requestRandomnessNow = false;
        result.payout = 0;
    }

    function quoteForfeitPayout(
        SessionContext calldata
    )
        external
        pure
        override
        returns (uint256 cashoutValue)
    {
        // Expired/forfeited sessions do not receive a payout.
        cashoutValue = 0;
    }
}