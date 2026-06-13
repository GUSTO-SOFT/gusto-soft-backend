export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'La password debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial';
