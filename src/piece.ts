export type Piece = {
	readonly left: number;
	readonly width: number;
	readonly top: number;
	readonly height: number;
};

export type StylizedPiece = Piece & {
	readonly className: string;
	/**
	 * @summary represents the CSS border radius in such way [topLeft, topRight, bottomRight, bottomLeft]
	 */
	readonly borderRadius: BorderRadius;
};

type BorderRadius = [string, string, string, string];

export const piece = ({
	left,
	width,
	top,
	height,
}: {
	left: number;
	width: number;
	top: number;
	height: number;
}): Piece => ({
	left,
	width,
	top,
	height,
});

export const stylizePiece = (
	piece: Piece,
	style: {
		className: string;
		/** @summary one radius for all sides */
		borderRadius: string;
	}
): StylizedPiece => ({
	...piece,
	className: style.className,
	borderRadius: new Array(4).fill(style.borderRadius) as BorderRadius,
});

export const render = (piece: StylizedPiece) => {
	let element = document.createElement("div");
	element.className = piece.className;
	return applyPiecePosition(piece, element);
};

export const recalculateOriginalBorderRelativeTo = (
	original: StylizedPiece,
	relative: StylizedPiece
) => {
	if (original.top < relative.top) {
		if (
			original.left >= relative.left + relative.width ||
			original.left === relative.left
		) {
			original.borderRadius[3] = "0";
		}

		if (original.left + original.width <= relative.left + relative.width) {
			original.borderRadius[2] = "0";
		}

		return original;
	}

	if (original.left === relative.left) {
		original.borderRadius[0] = "0";
	}

	if (original.left + original.width > relative.left) {
		original.borderRadius[1] = "0";
	}

	return original;
};

export const areEqual = (a: Piece, b: Piece) =>
	a.left == b.left &&
	a.top == b.top &&
	a.width == b.width &&
	a.height == b.height;

export const isUselessToRender = (piece: Piece) =>
	piece.width <= 0 || piece.height <= 0;

const applyPiecePosition = (piece: StylizedPiece, element: HTMLElement) => {
	element.style.borderRadius = piece.borderRadius.join(" ");

	element.style.left = piece.left + "px";
	if (piece.width >= 0) {
		element.style.width = piece.width + "px";
	}

	element.style.top = piece.top + "px";
	element.style.height = piece.height + "px";

	return element;
};

// export class Piece {
// 	private borderRadius = ["0.2em", "0.2em", "0.2em", "0.2em"];

// 	constructor(
// 		readonly left: number,
// 		readonly top: number,
// 		readonly width: number,
// 		readonly height: number,
// 		public className: string
// 	) {}

// 	populateClassName(className: string) {
// 		this.className = `${this.className} ${className}`;
// 	}

// 	recalculateStyleRelativeTo(piece: Piece) {
// 		if (this.top < piece.top) {
// 			if (
// 				this.left >= piece.left + piece.width ||
// 				this.left === piece.left
// 			) {
// 				this.borderRadius[3] = "0";
// 			}

// 			if (this.left + this.width <= piece.left + piece.width) {
// 				this.borderRadius[2] = "0";
// 			}
// 		} else {
// 			if (this.left === piece.left) {
// 				this.borderRadius[0] = "0";
// 			}

// 			if (this.left + this.width > piece.left) {
// 				this.borderRadius[1] = "0";
// 			}
// 		}
// 	}

// 	draw() {
// 		let element = document.createElement("div");
// 		element.className = this.className;
// 		return this.adjust(element);
// 	}

// 	adjust(element: HTMLElement): HTMLElement {
// 		element.style.borderRadius = this.borderRadius.join(" ");

// 		element.style.left = this.left + "px";
// 		element.style.top = this.top + "px";

// 		if (this.width >= 0) {
// 			element.style.width = this.width + "px";
// 		}
// 		element.style.height = this.height + "px";

// 		return element;
// 	}

// 	equal(p: Piece) {
// 		return (
// 			this.left == p.left &&
// 			this.top == p.top &&
// 			this.width == p.width &&
// 			this.height == p.height &&
// 			this.className == p.className
// 		);
// 	}

// 	isUseless() {
// 		return this.width == 0 || this.height == 0;
// 	}
// }
