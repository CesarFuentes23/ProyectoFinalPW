import { DataTypes } from 'sequelize';

export function decimal(nombre, escala = 2, opciones = {}) {
  return {
    type: DataTypes.DECIMAL(14, escala),
    allowNull: false,
    defaultValue: 0,
    get() {
      const valor = this.getDataValue(nombre);
      return valor === null ? null : Number(valor);
    },
    ...opciones
  };
}

export const texto = (largo = 120, opciones = {}) => ({
  type: DataTypes.STRING(largo),
  ...opciones
});
export const requerido = (largo = 120) => ({ type: DataTypes.STRING(largo), allowNull: false });
