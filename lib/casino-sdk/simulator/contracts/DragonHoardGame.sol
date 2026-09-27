// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ICasinoGameV2.sol";

contract DragonHoardGame is ICasinoGameV2 {
    uint256 private constant WAD = 1e18;
    uint256 private constant BPS = 10_000;

    uint256 private constant MAX_FLOOR = 7;
    uint256 private constant MAX_MULTIPLIER_BPS = 28_500;

    uint256 private constant RTP_WAD = 950_000_000_000_000_000;

    error DragonHoard__InvalidWager();
    error DragonHoard__InvalidAction();
    error DragonHoard__InvalidFloor();
    error DragonHoard__InvalidState();

    /*
        Floor multipliers:

        Floor 1 = 1.15x
        Floor 2 = 1.32x
        Floor 3 = 1.52x
        Floor 4 = 1.76x
        Floor 5 = 2.05x
        Floor 6 = 2.40x
        Floor 7 = 2.85x
    */

    function _multiplierBps(
        uint256 floor
    ) internal pure returns (uint256) {
        if (floor == 0) return BPS;
        if (floor == 1) return 11_500;
        if (floor == 2) return 13_200;
        if (floor == 3) return 15_200;
        if (floor == 4) return 17_600;
        if (floor == 5) return 20_500;
        if (floor == 6) return 24_000;
        if (floor == 7) return 28_500;

        revert DragonHoard__InvalidFloor();
    }

    /*
        Probability that a player survives the current floor.

        These probabilities are chosen so that each committed
        floor path has approximately 95% theoretical RTP.
    */

    function _safeProbabilityWad(
        uint256 floor
    ) internal pure returns (uint256) {
        if (floor == 1) {
            return 826_087_000_000_000_000;
        }

        if (floor == 2) {
            return 719_697_000_000_000_000;
        }

        if (floor == 3) {
            return 625_000_000_000_000_000;
        }

        if (floor == 4) {
            return 539_773_000_000_000_000;
        }

        if (floor == 5) {
            return 463_415_000_000_000_000;
        }

        if (floor == 6) {
            return 395_833_000_000_000_000;
        }

        if (floor == 7) {
            return 333_333_000_000_000_000;
        }

        revert DragonHoard__InvalidFloor();
    }

    /*
        Calculates probability of reaching the deepest floor.
    */
    function _fullPathProbabilityWad()
        internal
        pure
        returns (uint256 probabilityWad)
    {
        probabilityWad = WAD;

        for (uint256 floor = 1; floor <= MAX_FLOOR; floor++) {
            probabilityWad =
                (probabilityWad * _safeProbabilityWad(floor)) /
                WAD;
        }
    }

    /*
        quoteCaps

        The maximum possible payout is 2.85x the wager.
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
        if (wager == 0) {
            revert DragonHoard__InvalidWager();
        }

        uint256 maxPayout =
            (wager * MAX_MULTIPLIER_BPS) /
            BPS;

        maxEscrowStake = wager;

        maxReservedProfit =
            maxPayout > wager
                ? maxPayout - wager
                : 0;
    }

    /*
        quoteRiskParams

        Risk is quoted against the deepest 7-floor path.

        probabilityWad:
            Probability of surviving every floor.

        expectedPayout:
            Expected payout of the deepest path.

        bodyVarianceScaled:
            Variance of the deepest-path payout,
            normalized to WAD.
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
        if (wager == 0) {
            revert DragonHoard__InvalidWager();
        }

        maxPayout =
            (wager * MAX_MULTIPLIER_BPS) /
            BPS;

        probabilityWad = _fullPathProbabilityWad();

        uint256 multiplierWad =
            (MAX_MULTIPLIER_BPS * WAD) /
            BPS;

        uint256 meanMultiplierWad =
            (probabilityWad * multiplierWad) /
            WAD;

        expectedPayout =
            (wager * meanMultiplierWad) /
            WAD;

        uint256 secondMomentMultiplierWad =
            (probabilityWad *
                multiplierWad *
                multiplierWad) /
            WAD /
            WAD;

        uint256 meanSquaredWad =
            (meanMultiplierWad * meanMultiplierWad) /
            WAD;

        if (secondMomentMultiplierWad > meanSquaredWad) {
            bodyVarianceScaled =
                secondMomentMultiplierWad -
                meanSquaredWad;
        } else {
            bodyVarianceScaled = 0;
        }
    }

    /*
        Session starts with the player at Floor 0.

        The player can choose:

        0 = DESCEND
        1 = EXTRACT
    */
    function onSessionStart(
        SessionContext calldata ctx
    )
        external
        pure
        override
        returns (StepResult memory result)
    {
        if (ctx.wagerBase == 0) {
            revert DragonHoard__InvalidWager();
        }

        uint256 maxPayout =
            (ctx.wagerBase * MAX_MULTIPLIER_BPS) /
            BPS;

        uint256 maxReservedProfit =
            maxPayout > ctx.wagerBase
                ? maxPayout - ctx.wagerBase
                : 0;

        /*
            State:

            floor
            currentPayout
        */
        result.newGameState =
            abi.encode(
                uint256(0),
                ctx.wagerBase
            );

        result.escrowDelta = 0;

        result.reservedProfitDelta =
            int256(maxReservedProfit);

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
        if (actionData.length == 0) {
            revert DragonHoard__InvalidAction();
        }

        uint8 action =
            abi.decode(actionData, (uint8));

        (
            uint256 floor,
            uint256 currentPayout
        ) = abi.decode(
            ctx.gameState,
            (uint256, uint256)
        );

        if (action == 1) {
            /*
                EXTRACT
            */

            result.newGameState =
                abi.encode(
                    floor,
                    currentPayout
                );

            result.escrowDelta =
                -int256(ctx.escrowedStake);

            result.reservedProfitDelta =
                -int256(ctx.reservedProfit);

            result.nextPhase =
                SessionPhase.SETTLED;

            result.requestRandomnessNow = false;

            result.payout = currentPayout;

            return result;
        }

        if (action != 0) {
            revert DragonHoard__InvalidAction();
        }

        /*
            DESCEND
        */

        uint256 nextFloor = floor + 1;

        if (nextFloor > MAX_FLOOR) {
            revert DragonHoard__InvalidFloor();
        }

        uint256 nextPayout =
            (ctx.wagerBase *
                _multiplierBps(nextFloor)) /
            BPS;

        result.newGameState =
            abi.encode(
                nextFloor,
                nextPayout
            );

        result.escrowDelta = 0;

        result.reservedProfitDelta = 0;

        result.nextPhase =
            SessionPhase.WAITING_RANDOMNESS;

        result.requestRandomnessNow = true;

        result.payout = 0;
    }

    /*
        Randomness resolves whether the player survives
        the floor they just entered.
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
            uint256 floor,
            uint256 currentPayout
        ) = abi.decode(
            ctx.gameState,
            (uint256, uint256)
        );

        if (
            floor == 0 ||
            floor > MAX_FLOOR
        ) {
            revert DragonHoard__InvalidState();
        }

        uint256 roll =
            _uniformWad(randomness);

        uint256 safeProbability =
            _safeProbabilityWad(floor);

        bool survived =
            roll < safeProbability;

        if (!survived) {
            /*
                TRAP

                Player loses the wager.
            */

            result.newGameState =
                abi.encode(
                    floor,
                    uint256(0)
                );

            result.escrowDelta =
                -int256(ctx.escrowedStake);

            result.reservedProfitDelta =
                -int256(ctx.reservedProfit);

            result.nextPhase =
                SessionPhase.SETTLED;

            result.requestRandomnessNow = false;

            result.payout = 0;

            return result;
        }

        /*
            SAFE
        */

        result.newGameState =
            abi.encode(
                floor,
                currentPayout
            );

        result.escrowDelta = 0;

        /*
            If the player reaches Floor 7 safely,
            automatically settle the maximum payout.
        */
        if (floor == MAX_FLOOR) {
            result.reservedProfitDelta =
                -int256(ctx.reservedProfit);

            result.nextPhase =
                SessionPhase.SETTLED;

            result.requestRandomnessNow = false;

            result.payout = currentPayout;

            return result;
        }

        /*
            Player survived.

            Give them another choice:
            DESCEND or EXTRACT.
        */
        result.reservedProfitDelta = 0;

        result.nextPhase =
            SessionPhase.WAITING_PLAYER_ACTION;

        result.requestRandomnessNow = false;

        result.payout = 0;
    }

    /*
        Uniform random number in [0, WAD).

        Uses rejection sampling instead of:

            uint256(randomness) % WAD

        which would introduce modulo bias.
    */
    function _uniformWad(
        bytes32 randomness
    )
        internal
        pure
        returns (uint256)
    {
        uint256 limit =
            type(uint256).max -
            (
                type(uint256).max %
                WAD
            );

        uint256 x =
            uint256(randomness);

        uint256 nonce = 0;

        while (x >= limit) {
            nonce++;

            x =
                uint256(
                    keccak256(
                        abi.encode(
                            randomness,
                            "DRAGON_HOARD_RETRY",
                            nonce
                        )
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
        return 0;
    }
}