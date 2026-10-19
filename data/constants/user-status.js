// MotoClube — Status do usuário

export const USER_STATUS = Object.freeze({
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
  INVISIBLE: 'invisible'
});

export const USER_STATUS_LIST = Object.freeze([
  {
    id: USER_STATUS.ONLINE,
    label: 'Online',
    color: 'success'
  },
  {
    id: USER_STATUS.OFFLINE,
    label: 'Offline',
    color: 'neutral'
  },
  {
    id: USER_STATUS.BUSY,
    label: 'Ocupado',
    color: 'danger'
  },
  {
    id: USER_STATUS.AWAY,
    label: 'Ausente',
    color: 'warning'
  },
  {
    id: USER_STATUS.INVISIBLE,
    label: 'Invisível',
    color: 'neutral'
  }
]);

export function isValidUserStatus(status) {
  return Object.values(USER_STATUS).includes(status);
}

export function getUserStatus(status) {
  return USER_STATUS_LIST.find(item => item.id === status) || null;
}