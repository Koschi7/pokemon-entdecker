import type { ChainNode } from './types';

export function findNode(root: ChainNode, id: number): ChainNode | null {
  if (root.id === id) return root;
  for (const child of root.to) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Weg von der Basis bis zu `id`, z. B. Glumanda → Glutexo → Glurak. */
export function pathTo(root: ChainNode, id: number): number[] {
  if (root.id === id) return [id];
  for (const child of root.to) {
    const rest = pathTo(child, id);
    if (rest.length) return [root.id, ...rest];
  }
  return [];
}

export function nextStages(root: ChainNode, id: number): number[] {
  return findNode(root, id)?.to.map((n) => n.id) ?? [];
}

/**
 * Stufen für die Entwicklungs-Leiter: der Weg bis zum Pokémon und danach alle späteren Stufen.
 * Jede Stufe ist eine Liste, damit Verzweigungen (Evoli) nebeneinander stehen können.
 */
export function ladder(root: ChainNode, id: number): number[][] {
  const node = findNode(root, id);
  if (!node) return [[id]];
  const levels = pathTo(root, id).map((step) => [step]);
  let frontier = node.to;
  while (frontier.length) {
    levels.push(frontier.map((n) => n.id));
    frontier = frontier.flatMap((n) => n.to);
  }
  return levels;
}
