function kGameIsRestarting(args) {
    // TODO: when actually restarting
    return new Reg(0, 0);
}

function kFlushResources(args) {
    Debug.log("Entering room number " + args[0].toUint16());
    
    return VM.state.acc;
}

function kHaveMouse(args) {
    return new Reg(0, 0xFFFF);
}

var kMemoryInfoFunc = {
	K_MEMORYINFO_LARGEST_HEAP_BLOCK : 0, // Largest heap block available
	K_MEMORYINFO_FREE_HEAP : 1, // Total free heap memory
	K_MEMORYINFO_LARGEST_HUNK_BLOCK : 2, // Largest available hunk memory block
	K_MEMORYINFO_FREE_HUNK : 3, // Amount of free DOS paragraphs
	K_MEMORYINFO_TOTAL_HUNK : 4 // Total amount of hunk memory (SCI01)
};

function kMemoryInfo(args) {
	// The free heap size returned must not be 0xffff, or some memory
	// calculations will overflow. Crazy Nick's games handle up to 32746
	// bytes (0x7fea), otherwise they throw a warning that the memory is
	// fragmented
	var size = 0x7fea;

	switch (args[0].offset) {
	case kMemoryInfoFunc.K_MEMORYINFO_LARGEST_HEAP_BLOCK:
		// In order to prevent "Memory fragmented" dialogs from
		// popping up in some games, we must return FREE_HEAP - 2 here.
		return new Reg(0, size - 2);
	case kMemoryInfoFunc.K_MEMORYINFO_FREE_HEAP:
	case kMemoryInfoFunc.K_MEMORYINFO_LARGEST_HUNK_BLOCK:
	case kMemoryInfoFunc.K_MEMORYINFO_FREE_HUNK:
	case kMemoryInfoFunc.K_MEMORYINFO_TOTAL_HUNK:
		return new Reg(0, size);

	default:
		Debug.error("Unknown MemoryInfo operation: " +  args[0].offset);
	}

	return new Reg(0, 0);
}

var kTimeType = {
	KGETTIME_TICKS : 0,
	KGETTIME_TIME_12HOUR : 1,
	KGETTIME_TIME_24HOUR : 2,
	KGETTIME_DATE : 3
};

// TODO
function kGetTime(args) {
	var locTime = new Date();
	var retval = 0; // Avoid spurious warning

//    Debug.warn("kGetTime");

	var mode = (args.length > 0) ? args[0].toUint16() : 0;

	// Modes 2 and 3 are supported since 0.629.
	// This condition doesn't check that exactly, but close enough.
	if (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY && mode > 1)
		Debug.error("kGetTime called in SCI0 with mode " + mode + "(expected 0 or 1)");

	switch (mode) {
	case kTimeType.KGETTIME_TICKS :
		retval = Engine.getTicks();
		break;
	case kTimeType.KGETTIME_TIME_12HOUR :
		retval = ((locTime.getHours() % 12) << 12) | (locTime.getMinutes() << 6) | (locTime.getSeconds());
	//	debugC(kDebugLevelTime, "GetTime(12h) returns %d", retval);
		break;
	/*case kTimeType.KGETTIME_TIME_24HOUR :
		retval = (loc_time.tm_hour << 11) | (loc_time.tm_min << 5) | (loc_time.tm_sec >> 1);
		debugC(kDebugLevelTime, "GetTime(24h) returns %d", retval);
		break;
	case kTimeType.KGETTIME_DATE :
		retval = loc_time.tm_mday | ((loc_time.tm_mon + 1) << 5) | (((loc_time.tm_year + 1900) & 0x7f) << 9);
		debugC(kDebugLevelTime, "GetTime(date) returns %d", retval);
		break;*/
	default:
		Debug.error("Attempt to use unknown GetTime mode " + mode);
		break;
	}

	return new Reg(0, retval);
}

function kWait(args) {
	var sleepTime = args[0].toUint16();

	VM.state.wait(sleepTime);
	
	Debug.log("KMisc", "kWait " + sleepTime);

	return VM.state.acc;
}
