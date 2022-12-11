import { Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";

export default class Smoorth extends Plugin {
	async onload() {
		this.registerEditorExtension(SmoorthTheme);
	}

	onunload() {}
}

export const SmoorthTheme = EditorView.theme({
	".cm-vimCursorLayer .cm-fat-cursor": {
		border: "0 solid var(--text-highlight-bg)",
		borderRadius: "0.1em",
		outline: "solid var(--interactive-accent)",
		outlineWidth: "0.15em",
		color: "var(--text-on-accent)",
		transition: "all 80ms",
	},

	".cm-cursorLayer, .cm-vimCursorLayer": {
		animationTimingFunction: "cubic-bezier(0.85, 0, 0.15, 1) !important",
		animationIterationCount: "20 !important",
	},
});
