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

	".HyperMD-codeblock-bg": {
		backgroundColor: "transparent !important",
		border: "0 solid var(--code-background)",
		borderLeftWidth: "0.2em",
		borderRightWidth: "0.2em",
	},

	".HyperMD-codeblock-begin-bg": {
		backgroundColor: "transparent !important",
		borderTopWidth: "0.2em",
	},

	".HyperMD-codeblock-end-bg": {
		backgroundColor: "transparent !important",
		borderBottomWidth: "0.2em",
	},
});
