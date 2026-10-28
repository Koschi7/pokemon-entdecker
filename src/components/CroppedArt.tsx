import { motion } from 'motion/react';
import { asset } from '../data/assets';

type Box = [number, number, number, number];

type Props = {
  id: string | number;
  box: Box; // sichtbarer Umriss im quadratischen Artwork (aus bbox.json)
  height: number; // Höhe der sichtbaren Figur in px
  shiny?: boolean;
  className?: string;
};

/**
 * Artwork, auf den sichtbaren Umriss zugeschnitten: `height` ist die Höhe der Figur selbst,
 * nicht die des Bildes mit transparentem Rand. Größenänderungen werden weich animiert.
 */
export function CroppedArt({ id, box, height, shiny = false, className = '' }: Props) {
  const [x, y, w, h] = box;
  const image = height / h; // Kantenlänge des ganzen quadratischen Bildes
  const spring = { type: 'spring', stiffness: 170, damping: 22 } as const;
  return (
    <motion.span
      className={`relative block shrink-0 overflow-hidden ${className}`}
      initial={false}
      animate={{ height, width: image * w }}
      transition={spring}
    >
      <motion.img
        src={asset.art(id, shiny)}
        alt=""
        className="absolute max-w-none"
        initial={false}
        animate={{ width: image, height: image, left: -x * image, top: -y * image }}
        transition={spring}
      />
    </motion.span>
  );
}
