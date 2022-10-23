import {
	EditorSelection,
	SelectionRange,
	Extension,
	Facet,
	combineConfig,
	Prec,
} from "@codemirror/state";
import {
	BlockType,
	BlockInfo,
	ViewPlugin,
	ViewUpdate,
	EditorView,
	Direction,
} from "@codemirror/view";

// Added to selection rectangles vertical extent to prevent rounding
// errors from introducing gaps in the rendered content.
const enum C {
	Epsilon = 0.01,
}

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
export function drawSelection(config: SelectionConfig = {}): Extension {
	return [
		selectionConfig.of(config),
		drawSelectionPlugin,
		hideNativeSelection,
	];
}

type Measure = { rangePieces: Piece[] };

class Piece {
	private borderRadius = ["0.2em", "0.2em", "0.2em", "0.2em"];

	constructor(
		readonly left: number,
		readonly top: number,
		readonly width: number,
		readonly height: number,
		public className: string
	) {}

	populateClassName(className: string) {
		this.className = `${this.className} ${className}`;
	}

	recalculateStyleRelativeTo(piece: Piece) {
		if (this.top < piece.top) {
			if (
				this.left >= piece.left + piece.width ||
				this.left === piece.left
			) {
				this.borderRadius[3] = "0";
			}

			if (this.left + this.width <= piece.left + piece.width) {
				this.borderRadius[2] = "0";
			}
		} else {
			if (this.left === piece.left) {
				this.borderRadius[0] = "0";
			}

			if (this.left + this.width > piece.left) {
				this.borderRadius[1] = "0";
			}
		}
	}

	draw() {
		let element = document.createElement("div");
		element.className = this.className;
		return this.adjust(element);
	}

	adjust(element: HTMLElement): HTMLElement {
		element.style.borderRadius = this.borderRadius.join(" ");

		element.style.left = this.left + "px";
		element.style.top = this.top + "px";

		if (this.width >= 0) {
			element.style.width = this.width + "px";
		}
		element.style.height = this.height + "px";

		return element;
	}

	equal(p: Piece) {
		return (
			this.left == p.left &&
			this.top == p.top &&
			this.width == p.width &&
			this.height == p.height &&
			this.className == p.className
		);
	}

	isUseless() {
		return this.width == 0 || this.height == 0;
	}
}

const DEFAULT_SELECTION_LAYER = ".cm-selectionLayer";
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

		readPos(): Measure {
			let { state } = this.view,
				conf = state.facet(selectionConfig);

			let rangePieces = state.selection.ranges.flatMap((r) =>
				r.empty ? [] : measureRange(this.view, r)
			);

			const actualRangePieces = rangePieces.filter((p) => !p.isUseless());
			switch (actualRangePieces.length) {
				case 0:
				case 1:
					break;
				case 2:
					actualRangePieces[0].recalculateStyleRelativeTo(
						actualRangePieces[1]
					);
					actualRangePieces[1].recalculateStyleRelativeTo(
						actualRangePieces[0]
					);
					break;
				case 3:
					actualRangePieces[0].recalculateStyleRelativeTo(
						actualRangePieces[1]
					);
					actualRangePieces[1].recalculateStyleRelativeTo(
						actualRangePieces[0]
					);
					actualRangePieces[1].recalculateStyleRelativeTo(
						actualRangePieces[2]
					);
					actualRangePieces[2].recalculateStyleRelativeTo(
						actualRangePieces[1]
					);
					break;
				default:
					break;
			}

			return { rangePieces };
		}

		drawSelection({ rangePieces }: Measure) {
			if (
				rangePieces.length != this.rangePieces.length ||
				rangePieces.some((p, i) => !p.equal(this.rangePieces[i]))
			) {
				this.selectionLayer.textContent = "";
				for (let p of rangePieces)
					this.selectionLayer.appendChild(p.draw());
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
					node.classList.contains("cm-selectionBackground")
				) {
					node.style.borderRadius = "0";
				}
			});
		}
	}
);

const themeSpec = {
	".cm-line": {
		"& ::selection": { backgroundColor: "transparent !important" },
		"&::selection": { backgroundColor: "transparent !important" },
	},
};
const hideNativeSelection = Prec.highest(EditorView.theme(themeSpec));

function getBase(view: EditorView) {
	let rect = view.scrollDOM.getBoundingClientRect();
	let left =
		view.textDirection == Direction.LTR
			? rect.left
			: rect.right - view.scrollDOM.clientWidth;
	return {
		left: left - view.scrollDOM.scrollLeft,
		top: rect.top - view.scrollDOM.scrollTop,
	};
}

function wrappedLine(
	view: EditorView,
	pos: number,
	inside: { from: number; to: number }
) {
	let range = EditorSelection.cursor(pos);
	return {
		from: Math.max(
			inside.from,
			view.moveToLineBoundary(range, false, true).from
		),
		to: Math.min(
			inside.to,
			view.moveToLineBoundary(range, true, true).from
		),
		type: BlockType.Text,
	};
}

function blockAt(view: EditorView, pos: number): BlockInfo {
	let line = view.lineBlockAt(pos);
	if (Array.isArray(line.type))
		for (let l of line.type) {
			if (
				l.to > pos ||
				(l.to == pos && (l.to == line.to || l.type == BlockType.Text))
			)
				return l;
		}
	return line as any;
}

function measureRange(view: EditorView, range: SelectionRange): Piece[] {
	if (range.to <= view.viewport.from || range.from >= view.viewport.to)
		return [];
	let from = Math.max(range.from, view.viewport.from),
		to = Math.min(range.to, view.viewport.to);

	let ltr = view.textDirection == Direction.LTR;
	let content = view.contentDOM,
		contentRect = content.getBoundingClientRect(),
		base = getBase(view);
	let lineStyle = window.getComputedStyle(content.firstChild as HTMLElement);
	let leftSide =
		contentRect.left +
		parseInt(lineStyle.paddingLeft) +
		Math.min(0, parseInt(lineStyle.textIndent));
	let rightSide = contentRect.right - parseInt(lineStyle.paddingRight);

	let startBlock = blockAt(view, from),
		endBlock = blockAt(view, to);
	let visualStart: { from: number; to: number } | null =
		startBlock.type == BlockType.Text ? startBlock : null;
	let visualEnd: { from: number; to: number } | null =
		endBlock.type == BlockType.Text ? endBlock : null;
	if (view.lineWrapping) {
		if (visualStart) visualStart = wrappedLine(view, from, visualStart);
		if (visualEnd) visualEnd = wrappedLine(view, to, visualEnd);
	}
	if (visualStart && visualEnd && visualStart.from == visualEnd.from) {
		return pieces(drawForLine(range.from, range.to, visualStart));
	} else {
		let top = visualStart
			? drawForLine(range.from, null, visualStart)
			: drawForWidget(startBlock, false);
		let bottom = visualEnd
			? drawForLine(null, range.to, visualEnd)
			: drawForWidget(endBlock, true);
		let between = [];
		if ((visualStart || startBlock).to < (visualEnd || endBlock).from - 1)
			between.push(piece(leftSide, top.bottom, rightSide, bottom.top));
		else if (
			top.bottom < bottom.top &&
			view.elementAtHeight((top.bottom + bottom.top) / 2).type ==
				BlockType.Text
		)
			top.bottom = bottom.top = (top.bottom + bottom.top) / 2;
		return pieces(top).concat(between).concat(pieces(bottom));
	}

	function piece(left: number, top: number, right: number, bottom: number) {
		return new Piece(
			left - base.left,
			top - base.top - C.Epsilon,
			right - left,
			bottom - top + C.Epsilon,
			"cm-selectionBackground"
		);
	}
	function pieces({
		top,
		bottom,
		horizontal,
	}: {
		top: number;
		bottom: number;
		horizontal: number[];
	}) {
		let pieces = [];
		for (let i = 0; i < horizontal.length; i += 2)
			pieces.push(piece(horizontal[i], top, horizontal[i + 1], bottom));
		return pieces;
	}

	// Gets passed from/to in line-local positions
	function drawForLine(
		from: null | number,
		to: null | number,
		line: { from: number; to: number }
	) {
		let top = 1e9,
			bottom = -1e9,
			horizontal: number[] = [];
		function addSpan(
			from: number,
			fromOpen: boolean,
			to: number,
			toOpen: boolean,
			dir: Direction
		) {
			// Passing 2/-2 is a kludge to force the view to return
			// coordinates on the proper side of block widgets, since
			// normalizing the side there, though appropriate for most
			// coordsAtPos queries, would break selection drawing.
			let fromCoords = view.coordsAtPos(
				from,
				(from == line.to ? -2 : 2) as any
			)!;
			let toCoords = view.coordsAtPos(
				to,
				(to == line.from ? 2 : -2) as any
			)!;
			top = Math.min(fromCoords.top, toCoords.top, top);
			bottom = Math.max(fromCoords.bottom, toCoords.bottom, bottom);
			if (dir == Direction.LTR)
				horizontal.push(
					ltr && fromOpen ? leftSide : fromCoords.left,
					ltr && toOpen ? rightSide : toCoords.right
				);
			else
				horizontal.push(
					!ltr && toOpen ? leftSide : toCoords.left,
					!ltr && fromOpen ? rightSide : fromCoords.right
				);
		}

		let start = from ?? line.from,
			end = to ?? line.to;
		// Split the range by visible range and document line
		for (let r of view.visibleRanges)
			if (r.to > start && r.from < end) {
				for (
					let pos = Math.max(r.from, start),
						endPos = Math.min(r.to, end);
					;

				) {
					let docLine = view.state.doc.lineAt(pos);
					for (let span of view.bidiSpans(docLine)) {
						let spanFrom = span.from + docLine.from,
							spanTo = span.to + docLine.from;
						if (spanFrom >= endPos) break;
						if (spanTo > pos)
							addSpan(
								Math.max(spanFrom, pos),
								from == null && spanFrom <= start,
								Math.min(spanTo, endPos),
								to == null && spanTo >= end,
								span.dir
							);
					}
					pos = docLine.to + 1;
					if (pos >= endPos) break;
				}
			}
		if (horizontal.length == 0)
			addSpan(start, from == null, end, to == null, view.textDirection);

		return { top, bottom, horizontal };
	}

	function drawForWidget(block: BlockInfo, top: boolean) {
		let y = contentRect.top + (top ? block.top : block.bottom);
		return { top: y, bottom: y, horizontal: [] };
	}
}
