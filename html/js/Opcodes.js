var opcode = {
    op_bnot     : 0x00,	// 000
    op_add      : 0x01,	// 001
    op_sub      : 0x02,	// 002
    op_mul      : 0x03,	// 003
    op_div      : 0x04,	// 004
    op_mod      : 0x05,	// 005
    op_shr      : 0x06,	// 006
    op_shl      : 0x07,	// 007
    op_xor      : 0x08,	// 008
    op_and      : 0x09,	// 009
    op_or       : 0x0a,	// 010
    op_neg      : 0x0b,	// 011
    op_not      : 0x0c,	// 012
    op_eq_      : 0x0d,	// 013
    op_ne_      : 0x0e,	// 014
    op_gt_      : 0x0f,	// 015
    op_ge_      : 0x10,	// 016
    op_lt_      : 0x11,	// 017
    op_le_      : 0x12,	// 018
    op_ugt_     : 0x13,	// 019
    op_uge_     : 0x14,	// 020
    op_ult_     : 0x15,	// 021
    op_ule_     : 0x16,	// 022
    op_bt       : 0x17,	// 023
    op_bnt      : 0x18,	// 024
    op_jmp      : 0x19,	// 025
    op_ldi      : 0x1a,	// 026
    op_push     : 0x1b,	// 027
    op_pushi    : 0x1c,	// 028
    op_toss     : 0x1d,	// 029
    op_dup      : 0x1e,	// 030
    op_link     : 0x1f,	// 031
    op_call     : 0x20,	// 032
    op_callk    : 0x21,	// 033
    op_callb    : 0x22,	// 034
    op_calle    : 0x23,	// 035
    op_ret      : 0x24,	// 036
    op_send     : 0x25,	// 037
    // dummy      0x26,	// 038
    // dummy      0x27,	// 039
    op_class    : 0x28,	// 040
    // dummy      0x29,	// 041
    op_self     : 0x2a,	// 042
    op_super    : 0x2b,	// 043
    op_rest     : 0x2c,	// 044
    op_lea      : 0x2d,	// 045
    op_selfID   : 0x2e,	// 046
    // dummy      0x2f	// 047
    op_pprev    : 0x30,	// 048
    op_pToa     : 0x31,	// 049
    op_aTop     : 0x32,	// 050
    op_pTos     : 0x33,	// 051
    op_sTop     : 0x34,	// 052
    op_ipToa    : 0x35,	// 053
    op_dpToa    : 0x36,	// 054
    op_ipTos    : 0x37,	// 055
    op_dpTos    : 0x38,	// 056
    op_lofsa    : 0x39,	// 057
    op_lofss    : 0x3a,	// 058
    op_push0    : 0x3b,	// 059
    op_push1    : 0x3c,	// 060
    op_push2    : 0x3d,	// 061
    op_pushSelf : 0x3e,	// 062
    op_line     : 0x3f,	// 063
    op_lag      : 0x40,	// 064
    op_lal      : 0x41,	// 065
    op_lat      : 0x42,	// 066
    op_lap      : 0x43,	// 067
    op_lsg      : 0x44,	// 068
    op_lsl      : 0x45,	// 069
    op_lst      : 0x46,	// 070
    op_lsp      : 0x47,	// 071
    op_lagi     : 0x48,	// 072
    op_lali     : 0x49,	// 073
    op_lati     : 0x4a,	// 074
    op_lapi     : 0x4b,	// 075
    op_lsgi     : 0x4c,	// 076
    op_lsli     : 0x4d,	// 077
    op_lsti     : 0x4e,	// 078
    op_lspi     : 0x4f,	// 079
    op_sag      : 0x50,	// 080
    op_sal      : 0x51,	// 081
    op_sat      : 0x52,	// 082
    op_sap      : 0x53,	// 083
    op_ssg      : 0x54,	// 084
    op_ssl      : 0x55,	// 085
    op_sst      : 0x56,	// 086
    op_ssp      : 0x57,	// 087
    op_sagi     : 0x58,	// 088
    op_sali     : 0x59,	// 089
    op_sati     : 0x5a,	// 090
    op_sapi     : 0x5b,	// 091
    op_ssgi     : 0x5c,	// 092
    op_ssli     : 0x5d,	// 093
    op_ssti     : 0x5e,	// 094
    op_sspi     : 0x5f,	// 095
    op_plusag   : 0x60,	// 096
    op_plusal   : 0x61,	// 097
    op_plusat   : 0x62,	// 098
    op_plusap   : 0x63,	// 099
    op_plussg   : 0x64,	// 100
    op_plussl   : 0x65,	// 101
    op_plusst   : 0x66,	// 102
    op_plussp   : 0x67,	// 103
    op_plusagi  : 0x68,	// 104
    op_plusali  : 0x69,	// 105
    op_plusati  : 0x6a,	// 106
    op_plusapi  : 0x6b,	// 107
    op_plussgi  : 0x6c,	// 108
    op_plussli  : 0x6d,	// 109
    op_plussti  : 0x6e,	// 110
    op_plusspi  : 0x6f,	// 111
    op_minusag  : 0x70,	// 112
    op_minusal  : 0x71,	// 113
    op_minusat  : 0x72,	// 114
    op_minusap  : 0x73,	// 115
    op_minussg  : 0x74,	// 116
    op_minussl  : 0x75,	// 117
    op_minusst  : 0x76,	// 118
    op_minussp  : 0x77,	// 119
    op_minusagi : 0x78,	// 120
    op_minusali : 0x79,	// 121
    op_minusati : 0x7a,	// 122
    op_minusapi : 0x7b,	// 123
    op_minussgi : 0x7c,	// 124
    op_minussli : 0x7d,	// 125
    op_minussti : 0x7e,	// 126
    op_minusspi : 0x7f	// 127
};

// Opcode formats
var OpcodeParam = {
	Invalid : -1,
	None : 0,
	Byte : 1,
	SByte : 2,
	Word : 3,
	SWord : 4,
	Variable : 5,
	SVariable : 6,
	SRelative : 7,
	Property : 8,
	Global : 9,
	Local : 10,
	Temp : 11,
	Param : 12,
	Offset : 13,
	End : 14
};

var opcodeFormats = [
	/*00*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*04*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*08*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*0C*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*10*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*14*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.SRelative],
	/*18*/
	[OpcodeParam.SRelative], [OpcodeParam.SRelative], [OpcodeParam.SVariable], [OpcodeParam.None],
	/*1C*/
	[OpcodeParam.SVariable], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.Variable],
	/*20*/
	[OpcodeParam.SRelative, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.SVariable, OpcodeParam.Byte],
	/*24 (24=ret)*/
	[OpcodeParam.End], [OpcodeParam.Byte], [OpcodeParam.Invalid], [OpcodeParam.Invalid],
	/*28*/
	[OpcodeParam.Variable], [OpcodeParam.Invalid], [OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte],
	/*2C*/
	[OpcodeParam.SVariable], [OpcodeParam.SVariable, OpcodeParam.Variable], [OpcodeParam.None], [OpcodeParam.Invalid],
	/*30*/
	[OpcodeParam.None], [OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property],
	/*34*/
	[OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property],
	/*38*/
	[OpcodeParam.Property], [OpcodeParam.SRelative], [OpcodeParam.SRelative], [OpcodeParam.None],
	/*3C*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.Word],
	/*40-4F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*50-5F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*60-6F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*70-7F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param]
];

// TODO: put this somewhere sensible:
function adjustOpcodeFormats() {
//	if (g_sci->_features->detectLofsType() != SCI_VERSION_0_EARLY) {
		opcodeFormats[opcode.op_lofsa][0] = OpcodeParam.Offset;
		opcodeFormats[opcode.op_lofss][0] = OpcodeParam.Offset;
//	}
/*
#ifdef ENABLE_SCI32
	// In SCI32, some arguments are now words instead of bytes
	if (getSciVersion() >= SCI_VERSION_2) {
		g_sci->_opcode_formats[op_calle][2] = Script_Word;
		g_sci->_opcode_formats[op_callk][1] = Script_Word;
		g_sci->_opcode_formats[op_super][1] = Script_Word;
		g_sci->_opcode_formats[op_send][0] = Script_Word;
		g_sci->_opcode_formats[op_self][0] = Script_Word;
		g_sci->_opcode_formats[op_call][1] = Script_Word;
		g_sci->_opcode_formats[op_callb][1] = Script_Word;
	}

	if (getSciVersion() >= SCI_VERSION_3) {
		// TODO: There are also opcodes in
		// here to get the superclass, and possibly the species too.
		g_sci->_opcode_formats[0x4d/2][0] = Script_None;
		g_sci->_opcode_formats[0x4e/2][0] = Script_None;
	}
#endif*/
}

adjustOpcodeFormats();

function readVMInstruction(data, start) {
    var output = {
        offset : 0,
        opcode : 0,
        extendedOpcode : 0,
        params : []
    };
    
    var ptr = start;
    
    output.extendedOpcode = data.getByte(ptr++);
    output.opcode = output.extendedOpcode >> 1;
    
    for (var i = 0; opcodeFormats[output.opcode][i] != OpcodeParam.None && i < opcodeFormats[output.opcode].length; ++i) {
		//debugN("Opcode: 0x%x, Opnumber: 0x%x, temp: %d\n", opcode, opcode, temp);
		
		switch (opcodeFormats[output.opcode][i]) {

		case OpcodeParam.Byte:
			output.params[i] = data.getByte(ptr++);
			break;
		case OpcodeParam.SByte:
			output.params[i] = data.getSignedByte(ptr++);
			break;
		case OpcodeParam.Word:
			output.params[i] = data.getUint16LE(ptr);
			ptr += 2;
			break;
		case OpcodeParam.SWord:
			output.params[i] = data.getSint16LE(ptr);
			ptr += 2;
			break;

		case OpcodeParam.Variable:
		case OpcodeParam.Property:

		case OpcodeParam.Local:
		case OpcodeParam.Temp:
		case OpcodeParam.Global:
		case OpcodeParam.Param:

		case OpcodeParam.Offset:
			if ((output.extendedOpcode & 0x1) != 0) {
				output.params[i] = data.getByte(ptr++);
			} else {
				output.params[i] = data.getUint16LE(ptr);
				ptr += 2;
			}
			break;

		case OpcodeParam.SVariable:
		case OpcodeParam.SRelative:
			if ((output.extendedOpcode & 0x1) != 0) {
				output.params[i] = data.getSignedByte(ptr++);
			} else {
				output.params[i] = data.getSint16LE(ptr);
				ptr += 2;
			}
			break;

		case OpcodeParam.None:
		case OpcodeParam.End:
			break;

		case OpcodeParam.Invalid:
		default:
			Debug.error("opcode " + output.extendedOpcode + " (" + enumToString(opcodes, output.opcode) + ") param: " + i + " Invalid");
		}
	}
    
    output.offset = ptr - start;
    
    return output;
}
