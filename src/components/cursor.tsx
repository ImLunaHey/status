import { motion } from "framer-motion";

const CursorSvg: React.FC<{ colour: string }> = ({ colour }) => (
  <svg width="32" height="44" viewBox="0 0 24 36" fill="none">
    <path
      fill={colour}
      d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
    />
  </svg>
);

export const Cursor: React.FC<{ colour: string; x: number; y: number }> = ({
  colour,
  x,
  y,
}) => {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "0",
        left: "0",
      }}
      initial={{ x, y }}
      animate={{ x, y }}
      transition={{
        type: "spring",
        damping: 30,
        mass: 0.8,
        stiffness: 350,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-1.5rem",
          left: "1.5rem",
          fontSize: "0.75rem",
          fontWeight: "bold",
          color: colour,
        }}
      >
        {colour}
      </div>
      <CursorSvg colour={colour} />
    </motion.div>
  );
};
