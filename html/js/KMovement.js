function kInitBresen(args) {
	var mover = args[0];
	var client = readSelector(mover, SelectorCache.client);
	var stepFactor = (args.length >= 2) ? args[1].toUint16() : 1;
	var mover_x = readSelectorValueSigned(mover, SelectorCache.x);
	var mover_y = readSelectorValueSigned(mover, SelectorCache.y);
	var client_xStep = readSelectorValueSigned(client, SelectorCache.xStep) * stepFactor;
	var client_yStep = readSelectorValueSigned(client, SelectorCache.yStep) * stepFactor;

	var client_step;
	if (client_xStep < client_yStep)
		client_step = client_yStep * 2;
	else
		client_step = client_xStep * 2;

	var deltaX = mover_x - readSelectorValueSigned(client, SelectorCache.x);
	var deltaY = mover_y - readSelectorValueSigned(client, SelectorCache.y);
	var mover_dx = 0;
	var mover_dy = 0;
	var mover_i1 = 0;
	var mover_i2 = 0;
	var mover_di = 0;
	var mover_incr = 0;
	var mover_xAxis = 0;

	while (1) {
		mover_dx = client_xStep;
		mover_dy = client_yStep;
		mover_incr = 1;

		if (Math.abs(deltaX) >= Math.abs(deltaY)) {
			mover_xAxis = 1;
			if (deltaX < 0)
				mover_dx = -mover_dx;
			mover_dy = deltaX ? mover_dx * parseInt(deltaY / deltaX) : 0;
			mover_i1 = ((mover_dx * deltaY) - (mover_dy * deltaX)) * 2;
			if (deltaY < 0) {
				mover_incr = -1;
				mover_i1 = -mover_i1;
			}
			mover_i2 = mover_i1 - (deltaX * 2);
			mover_di = mover_i1 - deltaX;
			if (deltaX < 0) {
				mover_i1 = -mover_i1;
				mover_i2 = -mover_i2;
				mover_di = -mover_di;
			}
		} else {
			mover_xAxis = 0;
			if (deltaY < 0)
				mover_dy = -mover_dy;
			mover_dx = deltaY ? mover_dy * parseInt(deltaX / deltaY) : 0;
			mover_i1 = ((mover_dy * deltaX) - (mover_dx * deltaY)) * 2;
			if (deltaX < 0) {
				mover_incr = -1;
				mover_i1 = -mover_i1;
			}
			mover_i2 = mover_i1 - (deltaY * 2);
			mover_di = mover_i1 - deltaY;
			if (deltaY < 0) {
				mover_i1 = -mover_i1;
				mover_i2 = -mover_i2;
				mover_di = -mover_di;
			}
			break;
		}
		if (client_xStep <= client_yStep)
			break;
		if (!client_xStep)
			break;
		if (client_yStep >= Math.abs(mover_dy + mover_incr))
			break;

		client_step--;
		if (!client_step)
			Debug.error("kInitBresen failed");
		client_xStep--;
	}

	// set mover
	writeSelectorValue(mover, SelectorCache.dx, mover_dx);
	writeSelectorValue(mover, SelectorCache.dy, mover_dy);
	writeSelectorValue(mover, SelectorCache.b_i1, mover_i1);
	writeSelectorValue(mover, SelectorCache.b_i2, mover_i2);
	writeSelectorValue(mover, SelectorCache.b_di, mover_di);
	writeSelectorValue(mover, SelectorCache.b_incr, mover_incr);
	writeSelectorValue(mover, SelectorCache.b_xAxis, mover_xAxis);
	return VM.state.acc;
}

function kDoBresen(args) {
	var mover = args[0];
	var client = readSelector(mover, SelectorCache.client);
	var completed = false;
	var handleMoveCount = GameFeatures.handleMoveCount();

	if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
		var client_signal = readSelectorValue(client, SelectorCache.signal);
		writeSelectorValue(client, SelectorCache.signal, client_signal & ~ViewSignals.HitObstacle);
	}

	var mover_moveCnt = 1;
	var client_moveSpeed = 0;
	if (handleMoveCount) {
		mover_moveCnt = readSelectorValue(mover, SelectorCache.b_movCnt);
		client_moveSpeed = readSelectorValue(client, SelectorCache.moveSpeed);
		mover_moveCnt++;
	}

	if (client_moveSpeed < mover_moveCnt) {
		mover_moveCnt = 0;
		var client_x = readSelectorValueSigned(client, SelectorCache.x);
		var client_y = readSelectorValueSigned(client, SelectorCache.y);
		var mover_x = readSelectorValueSigned(mover, SelectorCache.x);
		var mover_y = readSelectorValueSigned(mover, SelectorCache.y);
		var mover_xAxis = readSelectorValueSigned(mover, SelectorCache.b_xAxis);
		var mover_dx = readSelectorValueSigned(mover, SelectorCache.dx);
		var mover_dy = readSelectorValueSigned(mover, SelectorCache.dy);
		var mover_incr = readSelectorValueSigned(mover, SelectorCache.b_incr);
		var mover_i1 = readSelectorValueSigned(mover, SelectorCache.b_i1);
		var mover_i2 = readSelectorValueSigned(mover, SelectorCache.b_i2);
		var mover_di = readSelectorValueSigned(mover, SelectorCache.b_di);
		var mover_org_i1 = mover_i1;
		var mover_org_i2 = mover_i2;
		var mover_org_di = mover_di;

		if ((getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY)) {
			// save current position into mover
			writeSelectorValue(mover, SelectorCache.xLast, client_x);
			writeSelectorValue(mover, SelectorCache.yLast, client_y);
		}

		// Store backups of all client selector variables. We will restore them
		// in case of a collision.
		var clientObject = SegManager.getObject(client);
		var clientVarNum = clientObject.getVarCount();
		var clientBackup = [];
		for (var i = 0; i < clientVarNum; ++i)
			clientBackup[i] = clientObject.getVariable(i);

		if (mover_xAxis) {
			if (Math.abs(mover_x - client_x) < Math.abs(mover_dx))
				completed = true;
		} else {
			if (Math.abs(mover_y - client_y) < Math.abs(mover_dy))
				completed = true;
		}
		if (completed) {
			client_x = mover_x;
			client_y = mover_y;
		} else {
			client_x += mover_dx;
			client_y += mover_dy;
			if (mover_di < 0) {
				mover_di += mover_i1;
			} else {
				mover_di += mover_i2;
				if (mover_xAxis == 0) {
					client_x += mover_incr;
				} else {
					client_y += mover_incr;
				}
			}
		}
		writeSelectorValue(client, SelectorCache.x, client_x);
		writeSelectorValue(client, SelectorCache.y, client_y);

		// Now call client::canBeHere/client::cantBehere to check for collisions
		var collision = false;
		var cantBeHere = new Reg(0, 0);
		var argv = VM.state.xs.sp + 1;

		if (SelectorCache.cantBeHere != -1) {
			// adding this here for hoyle 3 to get happy. CantBeHere is a dummy in hoyle 3 and acc is != 0 so we would
			//  get a collision otherwise
			VM.state.acc = new Reg(0, 0);
			invokeSelector(client, SelectorCache.cantBeHere, args.length, argv, []);
			if (!VM.state.acc.isNull())
				collision = true;
			cantBeHere = VM.state.acc.clone();
		} else {
			invokeSelector(client, SelectorCache.canBeHere, args.length, argv, []);
			if (VM.state.acc.isNull())
				collision = true;
		}

		if (collision) {
			// We restore the backup of the client variables
			for (var i = 0; i < clientVarNum; ++i)
				clientObject.getVariableRef(i).set(clientBackup[i]);

			mover_i1 = mover_org_i1;
			mover_i2 = mover_org_i2;
			mover_di = mover_org_di;

			var client_signal = readSelectorValue(client, SelectorCache.signal);
			writeSelectorValue(client, SelectorCache.signal, client_signal | ViewSignals.HitObstacle);
		}

		writeSelectorValue(mover, SelectorCache.b_i1, mover_i1);
		writeSelectorValue(mover, SelectorCache.b_i2, mover_i2);
		writeSelectorValue(mover, SelectorCache.b_di, mover_di);

		if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
			// In sci1egaonly this block of code was outside of the main if,
			// but client_x/client_y aren't set there, so it was an
			// uninitialized read in SSCI. (This issue was fixed in sci1early.)
			if (handleMoveCount)
				writeSelectorValue(mover, SelectorCache.b_movCnt, mover_moveCnt);
			// We need to compare directly in here, complete may have happened during
			//  the current move
			if ((client_x == mover_x) && (client_y == mover_y))
				invokeSelector(mover, SelectorCache.moveDone, args.length, argv);
			return VM.state.acc;
		}
	}

	if (handleMoveCount)
		writeSelectorValue(mover, SelectorCache.b_movCnt, mover_moveCnt);

	return VM.state.acc;
}

function kSetJump(args) {
	// Input data
	var object = args[0];
	var dx = args[1].toSint16();
	var dy = args[2].toSint16();
	var gy = args[3].toSint16();

	// Derived data
	var c;
	var tmp;
	var vx = 0;  // x velocity
	var vy = 0;  // y velocity

	var dxWasNegative = (dx < 0);
	dx = Math.abs(dx);

	if (dx == 0) {
		// Upward jump. Value of c doesn't really matter
		c = 1;
	} else {
		// Compute a suitable value for c respectively tmp.
		// The important thing to consider here is that we want the resulting
		// *discrete* x/y velocities to be not-too-big integers, for a smooth
		// curve (i.e. we could just set vx=dx, vy=dy, and be done, but that
		// is hardly what you would call a parabolic jump, would ya? ;-).
		//
		// So, we make sure that 2.0*tmp will be bigger than dx (that way,
		// we ensure vx will be less than sqrt(gy * dx)).
		if (dx + dy < 0) {
			// dy is negative and |dy| > |dx|
			c = parseInt((2 * Math.abs(dy)) / dx);
			//tmp = ABS(dy);  // ALMOST the resulting value, except for obvious rounding issues
		} else {
			// dy is either positive, or |dy| <= |dx|
			c = parseInt((dx * 3 / 2 - dy) / dx);

			// We force c to be strictly positive
			if (c < 1)
				c = 1;

			//tmp = dx * 3 / 2;  // ALMOST the resulting value, except for obvious rounding issues

			// FIXME: Where is the 3 coming from? Maybe they hard/coded, by "accident", that usually gy=3 ?
			// Then this choice of scalar will make t equal to roughly sqrt(dx)
		}
	}
	// POST: c >= 1
	tmp = c * dx + dy;
	// POST: (dx != 0)  ==>  ABS(tmp) > ABS(dx)
	// POST: (dx != 0)  ==>  ABS(tmp) ~>=~ ABS(dy)

	//debugC(kDebugLevelBresen, "c: %d, tmp: %d", c, tmp);

	// Compute x step
	if (tmp != 0 && dx != 0)
		vx = parseInt((dx * Math.sqrt(gy / (2.0 * tmp))));
	else
		vx = 0;

	// Restore the left/right direction: dx and vx should have the same sign.
	if (dxWasNegative)
		vx = -vx;

	if ((dy < 0) && (vx == 0)) {
		// Special case: If this was a jump (almost) straight upward, i.e. dy < 0 (upward),
		// and vx == 0 (i.e. no horizontal movement, at least not after rounding), then we
		// compute vy directly.
		// For this, we drop the assumption on the linear correlation of vx and vy (obviously).

		// FIXME: This choice of vy makes t roughly (2+sqrt(2))/gy * sqrt(dy);
		// so if gy==3, then t is roughly sqrt(dy)...
		vy = parseInt(Math.sqrt(gy * Math.abs(2 * dy)) + 1);
	} else {
		// As stated above, the vertical direction is correlated to the horizontal by the
		// (non-zero) factor c.
		// Strictly speaking, we should probably be using the value of vx *before* rounding
		// it to an integer... Ah well
		vy = c * vx;
	}

	// Always force vy to be upwards
	vy = -Math.abs(vy);

	//debugC(kDebugLevelBresen, "SetJump for object at %04x:%04x", PRINT_REG(object));
	//debugC(kDebugLevelBresen, "xStep: %d, yStep: %d", vx, vy);

	writeSelectorValue(object, SelectorCache.xStep, vx);
	writeSelectorValue(object, SelectorCache.yStep, vy);

	return VM.state.acc;
}