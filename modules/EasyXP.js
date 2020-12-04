/*
3-Dec-2020      Created from QuickEncounter.js        
*/

export const EASYXP = {
    MODULE_NAME : "easy-xp",
    MODULE_VERSION : "0.5.0"
}

export class EasyXP {

    static init() {
        game.settings.register(EASYXP.MODULE_NAME, "easyXPVersion", {
            name: "Quick Encounters Version",
            hint: "",
            scope: "system",
            config: false,
            default: EASYXP.MODULE_VERSION,
            type: String
        });
        game.settings.register(EASYXP.MODULE_NAME, "displayXPAfterCombat", {
            name: "EASYXP.DisplayXPAfterCombat.NAME",
            hint: "EASYXP.DisplayXPAfterCombat.HINT",
            scope: "world",
            config: true,
            visible: game.system.id === "dnd5e",
            default: true,
            type: Boolean
        });
    }

    static async onDeleteCombat(combat, options, userId) {
        //Only works with 5e
        //If the display XP option is set, work out how many defeated foes and how many Player tokens
        const shouldDisplayXPAfterCombat = game.settings.get(EASYXP.MODULE_NAME, "displayXPAfterCombat");
        if (!shouldDisplayXPAfterCombat || !combat || !game.user.isGM) {return;}

        //Get list of non-friendly NPCs
        const nonFriendlyNPCTokens = combat.turns?.filter(t => ((t.token?.disposition === TOKEN_DISPOSITIONS.HOSTILE) && (!t.actor || !t.players?.length)));
        //And of player-owned tokens
        const pcTokens = combat.turns?.filter(t => (t.actor && t.players?.length));

        //Now compute total XP and XP per player
        if (!nonFriendlyNPCTokens || !nonFriendlyNPCTokens.length || !pcTokens) {return;}
        const totalXP = EasyXP.computeTotalXPFromTokens(nonFriendlyNPCTokens);
        if (!totalXP) {return;}
        const xpPerPlayer = pcTokens.length ? Math.round(totalXP/pcTokens.length) : null;
        let content = game.i18n.localize("EASYXP.XPtoAward.TOTAL") + totalXP;
        if (xpPerPlayer) {content += (game.i18n.localize("QE.XPtoAward.PERPLAYER") + xpPerPlayer);}

        Dialog.prompt({
            title: game.i18n.localize("EASYXP.XPtoAward.TITLE"),
            content: content,
            label: "",
            callback: () => { console.log(`XP to award ${content}`); },
            options: {
                top: window.innerHeight - 350,
                left: window.innerWidth - 720,
                width: 400,
                jQuery: false
            }
        });
    }


    static getActorXP(actor) {
        if ((game.system.id !== "dnd5e") || !actor) {return null;}
        try {
            return actor.data?.data?.details?.xp?.value;
        } catch (err) {
            return null;
        }
    }

    static computeTotalXPFromTokens(tokens) {
        if ((game.system.id !== "dnd5e") || !tokens) { return; }
        let totalXP = null;
        for (const token of tokens) {
            totalXP += EasyXP.getActorXP(token.actor);
        }
        return totalXP;
    }

    computeTotalXP() {
        //Compute total XP from non-character, fixed-number (non-die-roll) extracted actors
        //The final XP depends on who was non-friendly, computed from what tokens you pass to computeTotalXPFromTokens
        const extractedActors = this.extractedActors;
        let totalXP = null;
        for (const eActor of extractedActors) {
            const actor = game.actors.get(eActor.actorID);
            const actorXP = EasyXP.getActorXP(actor);
            //Only include non-character tokens in XP
            if (actorXP && (actor.data.type === "npc")) {
                if (!totalXP) {totalXP = 0;}
                //Allow for numActors being a roll (e.g. [[/r 1d4]]) in which case we ignore the XP
                //although we probably should provide a range or average
                if (typeof eActor.numActors === "number") {
                    totalXP += eActor.numActors * actorXP;
                }
            }
        }
        return totalXP;
    }

    renderTotalXPLine() {
        const totalXP = this.computeTotalXP();
        if (!totalXP) {return null;}
        return `${game.i18n.localize("EASYXP.TotalXP.CONTENT")} ${totalXP}XP<br>`;
    }
}


 

export class Dialog3 extends Dialog {
    static async buttons3({title, content, button1cb, button2cb, button3cb, buttonLabels, options={}}) {
        //Also can function as a generic 2-button dialog by passing button3b=null
            return new Promise((resolve, reject) => {
        const dialog = new this({
            title: title,
            content: content,
            buttons: {
                button1: {
                    icon: null,
                    label: game.i18n.localize(buttonLabels[0]),
                    callback: html => {
                    const result = button1cb ? button1cb(html) : true;
                    resolve(result);
                    }
                },
                button2: {
                    icon: null,
                    label: game.i18n.localize(buttonLabels[1]),
                    callback: html => {
                    const result = button2cb ? button2cb(html) : false;
                    resolve(result);
                    }
                },
                button3: {
                    icon: null,
                    label: game.i18n.localize(buttonLabels[2]),
                    callback: html => {
                    const result = button3cb ? button3cb(html) : false;
                    resolve(result);
                    }
                }
            },
            default: "button1",
            close: () => reject
        }, options);

        if (!button3cb) {
            delete dialog.data.buttons.button3;
        }
        dialog.render(true);
        });
    }
}



/** HOOKS */
Hooks.on("deleteCombat", (combat, options, userId) => {
    EasyXP.onDeleteCombat(combat, options, userId);
});

Hooks.on("init", EasyXP.init);
