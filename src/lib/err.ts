export enum ErrType {
  TMP_GUARD_CREATE = 'Tmp guard file either already exists or cant be created.',
  TMP_GUARD_CHECK = 'Tmp guard file does not exist.',
  RH_HASH = 'rh sh256 hash not correct',
  RH_CANNOT_FETCH = 'cannot fetch resourcehacker',
  INVALID_TARGET = 'invalid target',
  ICON_ENONET = 'Icon file does not exist.',
  PKG_MISSING_SRC = 'No src path spcified for pkg.',
  PKG_MISSING_OUT = 'No out or outdir path spcified for pkg.'
}

export class Err extends Error {
  constructor(msg: ErrType, data?: string) {
    super()

    this.message = msg

    if (data) {
      this.message += data
    }
  }
}
