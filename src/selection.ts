import { Extension, Facet, combineConfig, Prec } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { Measure, measureRange } from "./measure";
import {
	areEqual,
	isUselessToRender,
	Piece,
	recalculateOriginalBorderRelativeTo,
	render,
	StylizedPiece,
	stylizePiece,
} from "./piece";

type SelectionConfig = {
	/// The length of a full cursor blink cycle, in milliseconds.
	/// Defaults to 1200. Can be set to 0 to disable blinking.
	cursorBlinkRate?: number;
	/// Whether to show a cursor for non-empty ranges. Defaults to
	/// true.
	drawRangeCursor?: boolean;
};

const selectionConfig = Facet.define<
	SelectionConfig,
	Required<SelectionConfig>
>({
	combine(configs) {
		return combineConfig(
			configs,
			{
				cursorBlinkRate: 1200,
				drawRangeCursor: true,
			},
			{
				cursorBlinkRate: (a, b) => Math.min(a, b),
				drawRangeCursor: (a, b) => a || b,
			}
		);
	},
});

/// Returns an extension that hides the browser's native selection and
/// cursor, replacing the selection with a background behind the text
/// (with the `cm-selectionBackground` class), and the
/// cursors with elements overlaid over the code (using
/// `cm-cursor-primary` and `cm-cursor-secondary`).
///
/// This allows the editor to display secondary selection ranges, and
/// tends to produce a type of selection more in line with that users
/// expect in a text editor (the native selection styling will often
/// leave gaps between lines and won't fill the horizontal space after
/// a line when the selection continues past it).
///
/// It does have a performance cost, in that it requires an extra DOM
/// layout cycle for many updates (the selection is drawn based on DOM
/// layout information that's only available after laying out the
/// content).
export const drawSelection = (config: SelectionConfig = {}): Extension => [
	selectionConfig.of(config),
	drawSelectionPlugin,
	hideNativeSelection,
];

const hideNativeSelection = Prec.highest(
	EditorView.theme({
		".cm-line": {
			"& ::selection": { backgroundColor: "transparent !important" },
			"&::selection": { backgroundColor: "transparent !important" },
		},
	})
);

const DEFAULT_SELECTION_LAYER = ".cm-selectionLayer";
const SELECTION_CLASS_NAME = "cm-selectionBackground";
const DEFAULT_SELECTION_BORDER_RADIUS = "0.2em";

type StylizedMeasure = {
	rangePieces: StylizedPiece[];
};

const drawSelectionPlugin = ViewPlugin.fromClass(
	class {
		rangePieces: readonly Piece[] = [];
		measureReq: { read: () => Measure; write: (value: Measure) => void };
		selectionLayer: HTMLElement;

		constructor(readonly view: EditorView) {
			this.measureReq = {
				read: this.readPos.bind(this),
				write: this.drawSelection.bind(this),
			};

			const existingSelectionLayer =
				view.dom.querySelector(".cm-selectionLayer");
			if (existingSelectionLayer instanceof HTMLElement) {
				this.selectionLayer = existingSelectionLayer;
				view.requestMeasure(this.measureReq);
			}
		}

		update(update: ViewUpdate) {
			if (!this.selectionLayer) {
				const existingSelectionLayer = update.view.dom.querySelector(
					DEFAULT_SELECTION_LAYER
				);
				if (existingSelectionLayer instanceof HTMLElement) {
					this.selectionLayer = existingSelectionLayer;
				}
			}

			let confChanged =
				update.startState.facet(selectionConfig) !=
				update.state.facet(selectionConfig);
			if (
				confChanged ||
				update.selectionSet ||
				update.geometryChanged ||
				update.viewportChanged
			)
				this.view.requestMeasure(this.measureReq);
		}

		readPos(): StylizedMeasure {
			let { state } = this.view,
				conf = state.facet(selectionConfig);

			let rangePieces = state.selection.ranges
				.flatMap((range) =>
					range.empty ? [] : measureRange(this.view, range)
				)
				.map((piece) =>
					stylizePiece(piece, {
						className: SELECTION_CLASS_NAME,
						borderRadius: DEFAULT_SELECTION_BORDER_RADIUS,
					})
				);

			const actualRangePieces = rangePieces.filter(
				(piece) => !isUselessToRender(piece)
			);
			switch (actualRangePieces.length) {
				case 0:
				case 1:
					break;
				case 2:
					recalculateOriginalBorderRelativeTo(
						actualRangePieces[0],
						actualRangePieces[1]
					);

					recalculateOriginalBorderRelativeTo(
						actualRangePieces[1],
						actualRangePieces[0]
					);

					break;
				case 3:
					recalculateOriginalBorderRelativeTo(
						actualRangePieces[0],
						actualRangePieces[1]
					);

					recalculateOriginalBorderRelativeTo(
						actualRangePieces[1],
						actualRangePieces[0]
					);

					recalculateOriginalBorderRelativeTo(
						actualRangePieces[1],
						actualRangePieces[2]
					);

					recalculateOriginalBorderRelativeTo(
						actualRangePieces[2],
						actualRangePieces[1]
					);

					break;
				default:
					break;
			}

			return { rangePieces };
		}

		drawSelection({ rangePieces }: StylizedMeasure) {
			if (
				rangePieces.length != this.rangePieces.length ||
				rangePieces.some(
					(piece, index) => !areEqual(piece, this.rangePieces[index])
				)
			) {
				this.selectionLayer.textContent = "";
				for (const piece of rangePieces) {
					this.selectionLayer.appendChild(render(piece));
				}
				this.rangePieces = rangePieces;
			}
		}

		destroy() {
			if (!this.selectionLayer) {
				return;
			}

			this.selectionLayer.childNodes.forEach((node) => {
				if (
					node.nodeType === Node.ELEMENT_NODE &&
					node instanceof HTMLElement &&
					node.classList.contains(SELECTION_CLASS_NAME)
				) {
					node.style.borderRadius = "0";
				}
			});
		}
	}
);
