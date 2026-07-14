export const LAYOUT_CONFIG = {
  MIN_V_GAP_BASE: 80, // Neighboring nodes min 80px
  V_GAP_BRANCH: 120, // Neighboring branches min 120px
  H_GAP_LEVEL: 180, // Between levels min 180px
  V_GAP_OFFSET: 15,
  H_GAP_BASE: 60,
  H_GAP_OFFSET: 40,
  GAP_CHILD_THRESHOLD: 3,
  GAP_CHILD_MULTIPLIER: 0.15,
  NODE_HEIGHT_THRESHOLD: 100,
  NODE_HEIGHT_MULTIPLIER: 1.15,
  
  DIMENSIONS: {
    ROOT: {
      CHAR_WIDTH: 9,
      H_PADDING: 100,
      MAX_WIDTH: 450,
      MIN_WIDTH: 220,
      LINE_HEIGHT: 32,
      V_PADDING: 60,
      MIN_HEIGHT: 120
    },
    LEVEL_1: {
      CHAR_WIDTH: 8,
      H_PADDING: 80,
      MAX_WIDTH: 400,
      MIN_WIDTH: 160,
      LINE_HEIGHT: 24,
      V_PADDING: 50,
      MIN_HEIGHT: 90
    },
    DEFAULT: {
      CHAR_WIDTH: 7,
      H_PADDING: 40,
      MAX_WIDTH: 400,
      MIN_WIDTH: 160,
      LINE_HEIGHT: 20,
      V_PADDING: 35,
      MIN_HEIGHT: 70
    },
    TOGGLE_BUTTON_MARGIN: 60,
    METADATA_HEIGHT: 20
  },
  
  COLLISION: {
    MAX_ITERATIONS: 3,
    BUFFER_H: 80,
    BUFFER_V: 60,
    OVERLAP_MARGIN: 10,
    RATIO_THRESHOLD: 1.2
  },
  
  DEFAULT_LEVEL_WIDTH: 220
};
