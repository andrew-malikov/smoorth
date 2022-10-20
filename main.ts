import { Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { drawSelection } from "selections";

export default class Smoorth extends Plugin {
	async onload() {
		this.registerEditorExtension(SmoorthTheme);
		this.registerEditorExtension(drawSelection());
	}

	onunload() {}
}

export const SmoorthTheme = EditorView.theme({
	".cm-line": {
		outline: "solid #0002",
		outlineWidth: "0",
		transition: "all 300ms",
	},

	".cm-active-line": {
		background: "#0002",
		border: "0 solid var(--background-modifier-accent)",
		borderRadius: "0.2em",
		outline: "solid #0002",
		outlineWidth: "0.4em",
	},

	".cm-vimCursorLayer .cm-fat-cursor": {
		border: "0 solid var(--text-highlight-bg)",
		borderRadius: "0.1em",
		outline: "solid var(--interactive-accent)",
		outlineWidth: "0.15em",
		color: "var(--text-on-accent)",
		transition: "all 80ms",
	},

	".cm-cursorLayer, .cm-vimCursorLayer": {
		animation:
			"cursor-phase 0.5s ease-in-out 0s infinite alternate !important",
	},
});
