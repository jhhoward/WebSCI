function kGetDistance(args) {
	var xdiff = (args.length > 3) ? args[3].toSint16() : 0;
	var ydiff = (args.length > 2) ? args[2].toSint16() : 0;
	var angle = (args.length > 5) ? args[5].toSint16() : 0;
	var xrel = parseInt((args[1].toSint16() - xdiff) / Math.cos(angle * Math.PI / 180.0)); // This works because cos(0)==1
	var yrel = args[0].toSint16() - ydiff;
	return new Reg(0, parseInt(Math.sqrt(xrel*xrel + yrel*yrel)));
}

function kGetAngleWorker(x1, y1, x2, y2) {
	var xRel = x2 - x1;
	var yRel = y1 - y2; // y-axis is mirrored.
	var angle;

	// Move (xrel, yrel) to first quadrant.
	if (y1 < y2)
		yRel = -yRel;
	if (x2 < x1)
		xRel = -xRel;

	// Compute angle in grads.
	if (yRel == 0 && xRel == 0)
		return 0;
	else
		angle = 100 * xRel / (xRel + yRel);

	// Fix up angle for actual quadrant of (xRel, yRel).
	if (y1 < y2)
		angle = 200 - angle;
	if (x2 < x1)
		angle = 400 - angle;

	// Convert from grads to degrees by merging grad 0 with grad 1,
	// grad 10 with grad 11, grad 20 with grad 21, etc. This leads to
	// "degrees" that equal either one or two grads.
	angle -= (angle + 9) / 10;
	return angle;
}


function kGetAngle(args) {
	// Based on behavior observed with a test program created with
	// SCI Studio.
	var x1 = args[0].toSint16();
	var y1 = args[1].toSint16();
	var x2 = args[2].toSint16();
	var y2 = args[3].toSint16();

	return new Reg(0, kGetAngleWorker(x1, y1, x2, y2));
}

function kAbs(args) {
	return new Reg(0, Math.abs(args[0].toSint16()));
}

function kSqrt(args) {
	return new Reg(0, parseInt(Math.sqrt(Math.abs(args[0].toSint16()))));
}

function kTimesSin(args) {
	var angle = args[0].toSint16();
	var factor = args[1].toSint16();

	return new Reg(0, parseInt(factor * Math.sin(angle * Math.PI / 180.0)));
}

function kSinMult(args) { return kTimesSin(args); }

function kTimesCos(args) {
	var angle = args[0].toSint16();
	var factor = args[1].toSint16();

	return new Reg(0, parseInt(factor * Math.cos(angle * Math.PI / 180.0)));
}

function kCosMult(args) { return kTimesCos(args); }

function kCosDiv(args) {
	var angle = args[0].toSint16();
	var value = args[1].toSint16();
	
	var cosval = Math.cos(angle * Math.PI / 180.0);

	if ((cosval < 0.0001) && (cosval > -0.0001)) {
		Debug.error("kCosDiv: Attempted division by zero");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(value / cosval));
}

function kSinDiv(args) {
	var angle = args[0].toSint16();
	var value = args[1].toSint16();
	var sinval = Math.sin(angle * Math.PI / 180.0);

	if ((sinval < 0.0001) && (sinval > -0.0001)) {
		Debug.error("kSinDiv: Attempted division by zero");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(value / sinval));
}

function kTimesTan(args) {
	var param = args[0].toSint16();
	var scale = (args.length > 1) ? args[1].toSint16() : 1;

	param -= 90;
	if ((param % 90) == 0) {
		Debug.error("kTimesTan: Attempted tan(pi/2)");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, - parseInt(Math.tan(param * Math.PI / 180.0) * scale));
}

function kTimesCot(args) {
	var param = args[0].toSint16();
	var scale = (args.length > 1) ? args[1].toSint16() : 1;

	if ((param % 90) == 0) {
		Debug.error("kTimesCot: Attempted tan(pi/2)");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(Math.tan(param * Math.PI / 180.0) * scale));
}