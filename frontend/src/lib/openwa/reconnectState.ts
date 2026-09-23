export interface ReconnectState {
  isConnected: boolean;
  hadConnected: boolean;
  wasDisconnected: boolean;
  connectionFailed: boolean;
}

export interface ReconnectDecision {
  invalidate: boolean;
  hadConnected: boolean;
  wasDisconnected: boolean;
}

export function nextReconnectState(state: ReconnectState): ReconnectDecision {
  if (state.isConnected) {
    return {
      invalidate: state.wasDisconnected,
      hadConnected: true,
      wasDisconnected: false,
    };
  }
  return {
    invalidate: false,
    hadConnected: state.hadConnected,
    wasDisconnected: state.wasDisconnected || state.hadConnected || state.connectionFailed,
  };
}
