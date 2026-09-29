// Password length policy — shared by server validation and the signup form.

export const PASSWORD_MIN_LENGTH = 8;
/** Bounded so a multi-megabyte "password" can't be used to burn CPU in scrypt. */
export const PASSWORD_MAX_LENGTH = 128;
