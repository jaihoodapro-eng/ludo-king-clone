var adSenseController = {
    interstitialName: "ingame_interstitial",
    rvName: "ingame_rv",
    adCloseCallback: null,
    adBeforeCallback: null,
    isRewardUser: false,

    setConfig(soundOn) {
        adConfig({
            sound: soundOn ? 'on' : 'off',
        });
    },

    showInterstitial(beforeCallback, closeCallback) {
        console.log("Showing Interstitial Ad");
        this.adBeforeCallback = beforeCallback;
        this.adCloseCallback = closeCallback;

        adBreak({
            type: 'next',  // ad shows at start of next level
            name: this.interstitialName,
            beforeAd: () => { this.beforeAdShown(); },  // You may also want to mute the game's sound.
            afterAd: () => { this.afterAdShown(); },    // resume the game flow.
            adBreakDone: (placementInfo) => { this.adBreakDoneCallback(placementInfo); }
        });
    },

    showRewardedVideo(beforeCallback, closeCallback) {
        console.log("Showing Rewarded Video Ad");
        this.isRewardUser = false;
        this.adBeforeCallback = beforeCallback;
        this.adCloseCallback = closeCallback;

        adBreak({
            type: 'reward',  // ad shows at start of next level
            name: this.rvName,
            beforeAd: () => { this.beforeAdShown(); },  // You may also want to mute the game's sound.
            afterAd: () => { this.afterAdShown(); },    // resume the game flow.
            beforeReward: (showAdFn) => { this.rvLoadedAndWaiting(showAdFn); },
            adDismissed: () => { this.adDismissedCallback(); },
            adViewed: () => { this.adViewedCallback(); },
            adBreakDone: (placementInfo) => { this.adBreakDoneCallback(placementInfo); }
        });
    },

    onAdReady() {
        console.log("Ad Loaded");
    },

    beforeAdShown() {
        console.log("beforeAdShown");
        this.adBeforeCallback && this.adBeforeCallback();
    },

    rvLoadedAndWaiting(showAdFn) {
        console.log("rvLoadedAndWaiting");
        showAdFn();
    },

    adDismissedCallback() {
        console.log("adDismissedCallback");
    },

    adViewedCallback() {
        console.log("adViewedCallback");
        this.isRewardUser = true;
    },

    afterAdShown() {
        console.log("afterAdShown");
    },

    adBreakDoneCallback(placementInfo) {
        console.log("adBreakDoneCallback: " + placementInfo.breakStatus);
        this.adCloseCallback && this.adCloseCallback(placementInfo.breakStatus != "viewed" && placementInfo.breakStatus != "dismissed" ? "error" : "");
    },

    gratifyUser() {
        return this.isRewardUser;
    }
}