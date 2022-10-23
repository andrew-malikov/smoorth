import { EditorSelection, SelectionRange } from "@codemirror/state";
import { BlockInfo, BlockType, Direction, EditorView } from "@codemirror/view";
import { piece, Piece } from "./piece";

export type Measure = { rangePieces: Piece[] };

// Added to selection rectangles vertical extent to prevent rounding
// errors from introducing gaps in the rendered content.
const enum C {
	Epsilon = 0.01,
}

export const measureRange = (
	view: EditorView,
	range: SelectionRange
): Piece[] => {
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
			between.push(
				getPieceFromCoordinates(
					leftSide,
					top.bottom,
					rightSide,
					bottom.top
				)
			);
		else if (
			top.bottom < bottom.top &&
			view.elementAtHeight((top.bottom + bottom.top) / 2).type ==
				BlockType.Text
		)
			top.bottom = bottom.top = (top.bottom + bottom.top) / 2;
		return pieces(top).concat(between).concat(pieces(bottom));
	}

	function getPieceFromCoordinates(
		left: number,
		top: number,
		right: number,
		bottom: number
	) {
		return piece({
			left: left - base.left,
			top: top - base.top - C.Epsilon,
			width: right - left,
			height: bottom - top + C.Epsilon,
		});
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
			pieces.push(
				getPieceFromCoordinates(
					horizontal[i],
					top,
					horizontal[i + 1],
					bottom
				)
			);
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
};

const getBase = (view: EditorView) => {
	let rect = view.scrollDOM.getBoundingClientRect();
	let left =
		view.textDirection == Direction.LTR
			? rect.left
			: rect.right - view.scrollDOM.clientWidth;
	return {
		left: left - view.scrollDOM.scrollLeft,
		top: rect.top - view.scrollDOM.scrollTop,
	};
};

const wrappedLine = (
	view: EditorView,
	position: number,
	inside: { from: number; to: number }
) => {
	let range = EditorSelection.cursor(position);
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
};

const blockAt = (view: EditorView, pos: number): BlockInfo => {
	let line = view.lineBlockAt(pos);
	if (Array.isArray(line.type))
		for (let l of line.type) {
			if (
				l.to > pos ||
				(l.to == pos && (l.to == line.to || l.type == BlockType.Text))
			)
				return l;
		}
	return line;
};
