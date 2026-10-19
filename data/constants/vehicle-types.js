// MotoClube — Tipos de veículo
// Veículos permitidos no sistema.
//
// Regra:
// - Moto
// - Carro
// - A pé (opção virtual permanente)
//
// Não adicionar avião, caminhão ou outros tipos sem alterar
// as regras de negócio do projeto.

export const VEHICLE_TYPES = Object.freeze({
  MOTORCYCLE: 'motorcycle',
  CAR: 'car',
  ON_FOOT: 'on_foot'
});

export const VEHICLE_TYPE_LIST = Object.freeze([
  {
    id: VEHICLE_TYPES.MOTORCYCLE,
    label: 'Moto',
    icon: 'motorcycle',
    virtual: false
  },
  {
    id: VEHICLE_TYPES.CAR,
    label: 'Carro',
    icon: 'car',
    virtual: false
  },
  {
    id: VEHICLE_TYPES.ON_FOOT,
    label: 'A pé',
    icon: 'person',
    virtual: true,
    permanent: true
  }
]);

export function isValidVehicleType(type) {
  return Object.values(VEHICLE_TYPES).includes(type);
}

export function getVehicleType(type) {
  return VEHICLE_TYPE_LIST.find(vehicle => vehicle.id === type) || null;
}

export function isVirtualVehicle(type) {
  return getVehicleType(type)?.virtual === true;
}