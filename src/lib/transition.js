/**
 * État partagé de la transition entre pages, côté navigateur.
 * PageTransition le passe à « pending » avant de pousser la nouvelle route ;
 * la PageReveal de la page qui arrive attend alors le signal enter() pour
 * lancer ses apparitions, au moment où le voile commence à se retirer.
 */
let pending = false;
const listeners = new Set();

export const transition = {
  isPending: () => pending,
  setPending(value) {
    pending = value;
  },
  onEnter(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  enter() {
    pending = false;
    for (const callback of [...listeners]) callback();
  },
};
