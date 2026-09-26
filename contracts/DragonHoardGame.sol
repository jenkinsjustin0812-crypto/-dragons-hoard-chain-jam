// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/casino-sdk/simulator/contracts/ICasinoGameV2.sol";

contract DragonHoardGame is ICasinoGameV2 {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS = 10_000;

    // Floor payout multipliers.
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

    /*
        Probability that the player survives each floor.

        These probabilities are intentionally independent
        per descent and are used by the VRF outcome.
    */
    uint256[7] internal FLOOR_SAFE_PROBABILITIES = [
        uint256(826086956521739130), // 82.6087%
        uint256(719696969696969696), // 71.9697%
        uint256(625000000000000000), // 62.5%
        uint256(539772727272727272), // 53.9773%
        uint256(463414634146341463), // 46.3415%
        uint256(395833333333333333), // 39.5833%
        uint256(333333333333333333)  // 33.3333%
    ];

    /*
        gameState:

        uint8   floor
        uint256 currentPayout
        bool    active
    */

    /*
        Returns the maximum escrow and reserved profit
        required for the maximum possible payout.
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
        uint256 maxPayout =
            (wager * FLOOR_MULTIPLIERS[6]) / BPS;

        maxEscrowStake = wager;

        maxReservedProfit =
            maxPayout > wager
                ? maxPayout - wager
                : 0;
    }

    /*
        Risk information used by the casino reserve model.

        The top-tier outcome is reaching the deepest floor
        and surviving that final VRF check.

        The expected payout is calculated from the complete
        sequence of survival probabilities.
    */
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
        maxPayout =
            (wager * FLOOR_MULTIPLIERS[6]) / BPS;

        probabilityWad = WAD;

        for (uint256 i = 0; i < FLOOR_SAFE_PROBABILITIES.length; i++) {
            probabilityWad =
                (probabilityWad *
                    FLOOR_SAFE_PROBABILITIES[i]) /
                WAD;
        }

        expectedPayout =
            (maxPayout * probabilityWad) /
            WAD;

        /*
            Conservative variance bound.

            The casino risk model requires a non-negative
            body variance term. Using maxPayout² gives the
            reserve model a conservative upper bound.
        */
        bodyVarianceScaled =
            maxPayout * maxPayout;
    }

    /*
        Start a new Dragon's Hoard session.

        Player begins at floor 0 with their original wager
        as the current extraction value.
    */
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

        result.nextPhase =
            SessionPhase.WAITING_PLAYER_ACTION;

        result.requestRandomnessNow = false;
        result.payout = 0;
    }

    /*
        Player actions:

        0 = DESCEND
        1 = EXTRACT
    */
    function onPlayerAction(
        SessionContext calldata ctx,
        bytes calldata actionData
    )
        external
        pure
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

        require(
            active,
            "DragonHoard: inactive"
        );

        require(
            actionData.length == 1,
            "DragonHoard: bad action"
        );

        uint8 action =
            uint8(actionData[0]);

        /*
            EXTRACT
        */
        if (action == 1) {
            result.newGameState = abi.encode(
                floor,
                currentPayout,
                false
            );

            result.escrowDelta = 0;
            result.reservedProfitDelta = 0;

            result.nextPhase =
                SessionPhase.SETTLED;

            result.requestRandomnessNow = false;

            result.payout =
                currentPayout;

            return result;
        }

        /*
            DESCEND
        */
        require(
            action == 0,
            "DragonHoard: invalid action"
        );

        require(
            floor < FLOOR_MULTIPLIERS.length,
            "DragonHoard: deepest floor"
        );

        uint8 nextFloor =
            floor + 1;

        uint256 nextPayout =
            (ctx.wagerBase *
                FLOOR_MULTIPLIERS[nextFloor - 1]) /
            BPS;

        result.newGameState = abi.encode(
            nextFloor,
            nextPayout,
            true
        );

        result.escrowDelta = 0;
        result.reservedProfitDelta = 0;

        result.nextPhase =
            SessionPhase.WAITING_RANDOMNESS;

        result.requestRandomnessNow = true;
        result.payout = 0;
    }

    /*
        Process Chain VRF randomness.

        IMPORTANT:
        We do NOT use:
            randomness % WAD

        Instead, rejection sampling is used so that
        the random distribution does not introduce
        modulo bias.
    */
    function onRandomness(
        SessionContext calldata ctx,
        bytes32 randomness
    )
        external
        pure
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

        require(
            active,
            "DragonHoard: inactive"
        );

        require(
            floor > 0,
            "DragonHoard: invalid floor"
        );

        require(
            floor <= FLOOR_SAFE_PROBABILITIES.length,
            "DragonHoard: invalid floor"
        );

        uint256 safeProbability =
            FLOOR_SAFE_PROBABILITIES[floor - 1];

        /*
            Convert the VRF word to an unbiased
            value in [0, WAD).

            Rejection sampling avoids modulo bias.
        */
        uint256 randomValue =
            _uniformWad(randomness);

        /*
            SAFE
        */
        if (randomValue < safeProbability) {
            result.newGameState = abi.encode(
                floor,
                currentPayout,
                true
            );

            result.escrowDelta = 0;
            result.reservedProfitDelta = 0;

            /*
                Reaching the deepest floor automatically
                settles the session.
            */
            if (
                floor ==
                FLOOR_MULTIPLIERS.length
            ) {
                result.nextPhase =
                    SessionPhase.SETTLED;

                result.requestRandomnessNow = false;

                result.payout =
                    currentPayout;
            } else {
                result.nextPhase =
                    SessionPhase.WAITING_PLAYER_ACTION;

                result.requestRandomnessNow = false;
                result.payout = 0;
            }

            return result;
        }

        /*
            TRAP
        */
        result.newGameState = abi.encode(
            floor,
            uint256(0),
            false
        );

        result.escrowDelta = 0;
        result.reservedProfitDelta = 0;

        result.nextPhase =
            SessionPhase.SETTLED;

        result.requestRandomnessNow = false;

        result.payout = 0;
    }

    /*
        Rejection sampling.

        Produces an unbiased number in [0, WAD).
    */
    function _uniformWad(
        bytes32 randomness
    )
        internal
        pure
        returns (uint256)
    {
        uint256 x =
            uint256(randomness);

        uint256 limit =
            type(uint256).max -
            (
                type(uint256).max %
                WAD
            );

        if (x >= limit) {
            x =
                uint256(
                    keccak256(
                        abi.encode(
                            randomness,
                            "DRAGON_HOARD_RETRY"
                        )
                    );
        }

        return x % WAD;
    }

    /*
        Expired / forfeited sessions receive no payout.
    */
    function quoteForfeitPayout(
        SessionContext calldata
    )
        external
        pure
        override
        returns (uint256 cashoutValue)
    {
        cashoutValue = 0;
    }
}