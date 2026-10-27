// Deliberately unavailable until a trusted, deployed and verified service exists.
// No frontend Firebase Auth signup, profile write, role edit or deletion fallback.
export const STAFF_ADMINISTRATION_READY=false;
const unavailable=async()=>{throw Error('Administration des comptes indisponible : service sécurisé requis.');};
export const staffAdministration=Object.freeze({create:unavailable,updateRole:unavailable,deactivate:unavailable,remove:unavailable});
