var SciVersion = {
	SCI_VERSION_NONE : 0,
	SCI_VERSION_0_EARLY : 1, // KQ4 early, LSL2 early, XMAS card 1988
	SCI_VERSION_0_LATE : 2, // KQ4, LSL2, LSL3, SQ3 etc
	SCI_VERSION_01 : 3, // KQ1 and multilingual games (S.old.*)
	SCI_VERSION_1_EGA_ONLY : 4, // SCI 1 EGA with parser (i.e. QFG2 only)
	SCI_VERSION_1_EARLY : 5, // KQ5 floppy, SQ4 floppy, XMAS card 1990, Fairy tales, Jones floppy
	SCI_VERSION_1_MIDDLE : 6, // LSL1, Jones CD
	SCI_VERSION_1_LATE : 7, // Dr. Brain 1, EcoQuest 1, Longbow, PQ3, SQ1, LSL5, KQ5 CD
	SCI_VERSION_1_1 : 8, // Dr. Brain 2, EcoQuest 1 CD, EcoQuest 2, KQ6, QFG3, SQ4CD, XMAS 1992 and many more
	SCI_VERSION_2 : 9, // GK1, PQ4 floppy, QFG4 floppy
	SCI_VERSION_2_1 : 10, // GK2, KQ7, LSL6 hires, MUMG Deluxe, Phantasmagoria 1, PQ4CD, PQ:SWAT, QFG4CD, Shivers 1, SQ6, Torin
	SCI_VERSION_3 : 11 // LSL7, Lighthouse, RAMA, Phantasmagoria 2
}

function getSciVersion() {
    // TODO: fix stub
    return SciVersion.SCI_VERSION_0_LATE;
}

function detectLofsType() {
    // TODO: fix stub
    return SciVersion.SCI_VERSION_0_EARLY;
}

