function Point(x, y) {
    if(typeof x == 'undefined') {
        x = 0;
        y = 0;
    }

    this.x = x;
    this.y = y;
}

Point.prototype = {
	sqrDist : function(p) {
		var diffx = Math.abs(p.x - x);
		if (diffx >= 0x1000)
			return 0xFFFFFF;

		var diffy = Math.abs(p.y - y);
		if (diffy >= 0x1000)
			return 0xFFFFFF;

		return parseInt(diffx * diffx + diffy * diffy);
	}
};


function Rect(x1, y1, x2, y2) {
    if(typeof x1 == 'undefined') {
        x1 = y1 = x2 = y2 = 0;
    }
    else if(typeof x2 == 'undefined') {
        x2 = x1;
        y2 = y1;
        x1 = 0;
        y1 = 0;
    }

    this.top = y1;
    this.left = x1;
    this.bottom = y2;
    this.right = x2;
}

Rect.prototype = {
    clone : function() {
        return new Rect(this.left, this.top, this.right, this.bottom);
    },
	width : function() { return this.right - this.left; },
	height : function() { return this.bottom - this.top; },

	setWidth : function(aWidth) {
		this.right = this.left + aWidth;
	},

	setHeight : function(aHeight) {
		this.bottom = this.top + aHeight;
	},

	/**
	 * Check if given position is inside this rectangle.
	 *
	 * @param x the horizontal position to check
	 * @param y the vertical position to check
	 *
	 * @return true if the given position is inside this rectangle, false otherwise
	 */
	contains : function(x, y) {
		return (this.left <= x) && (x < this.right) && (this.top <= y) && (y < this.bottom);
	},

	/**
	 * Check if the given rect is contained inside this rectangle.
	 *
	 * @param r The rectangle to check
	 *
	 * @return true if the given rect is inside, false otherwise
	 */
	containsRect : function(r) {
		return (this.left <= r.left) && (r.right <= this.right) && (this.top <= r.top) && (r.bottom <= this.bottom);
	},

	/**
	 * Check if the given rect is equal to this one.
	 *
	 * @param r The rectangle to check
	 *
	 * @return true if the given rect is equal, false otherwise
	 */
	equals : function(r)  {
		return (this.left == r.left) && (this.right == r.right) && (this.top == r.top) && (this.bottom == r.bottom);
	},

	/**
	 * Check if given rectangle intersects with this rectangle
	 *
	 * @param r the rectangle to check
	 *
	 * @return true if the given rectangle is inside the rectangle, false otherwise
	 */
	intersects : function(r) {
		return (this.left < r.right) && (r.left < this.right) && (this.top < r.bottom) && (r.top < this.bottom);
	},

	/**
	 * Extend this rectangle so that it contains r
	 *
	 * @param r the rectangle to extend by
	 */
	extend : function(r) {
		this.left = Math.min(this.left, r.left);
		this.right = Math.max(this.right, r.right);
		this.top = Math.min(this.top, r.top);
		this.bottom = Math.max(this.bottom, r.bottom);
	},

	/**
	 * Extend this rectangle in all four directions by the given number of pixels
	 *
	 * @param offset the size to grow by
	 */
	grow : function(offset) {
		this.top -= offset;
		this.left -= offset;
		this.bottom += offset;
		this.right += offset;
	},

	clip : function(r) {
		if (this.top < r.top) this.top = r.top;
		else if (this.top > r.bottom) this.top = r.bottom;

		if (this.left < r.left) this.left = r.left;
		else if (this.left > r.right) this.left = r.right;

		if (this.bottom > r.bottom) this.bottom = r.bottom;
		else if (this.bottom < r.top) this.bottom = r.top;

		if (this.right > r.right) this.right = r.right;
		else if (this.right < r.left) this.right = r.left;
	},

	isEmpty : function() {
		return (this.left >= this.right || this.top >= this.bottom);
	},

	isValidRect : function() {
		return (this.left <= this.right && this.top <= this.bottom);
	},

	moveTo : function(x, y) {
		this.bottom += y - this.top;
		this.right += x - this.left;
		this.top = y;
		this.left = x;
	},

	translate : function(dx, dy) {
		this.left += dx; this.right += dx;
		this.top += dy; this.bottom += dy;
	}
};
