import { useCallback, useRef } from 'react';
import { useReactFlow, ReactFlowInstance } from '@xyflow/react';
import { UI_CONFIG } from '../../config/ui';

export function useCamera() {
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const { setCenter, fitView, getZoom } = useReactFlow();

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
  }, []);

  const centerNode = useCallback((x: number, y: number, zoom?: number) => {
    if (!setCenter || !getZoom) return;
    setCenter(x, y, { 
      duration: UI_CONFIG.ZOOM.DURATION, 
      zoom: zoom ?? Math.max(getZoom(), 0.7) 
    });
  }, [setCenter, getZoom]);

  const resetView = useCallback(() => {
    if (!setCenter) return;
    setCenter(0, 0, { duration: UI_CONFIG.ZOOM.DURATION, zoom: 0.8 });
  }, [setCenter]);

  const fitToView = useCallback((padding = 0.3) => {
    if (!fitView) return;
    setTimeout(() => {
      fitView({ duration: UI_CONFIG.ZOOM.DURATION, padding });
    }, 50);
  }, [fitView]);

  return {
    rfInstance,
    handleInit,
    centerNode,
    resetView,
    fitToView,
    getZoom
  };
}
