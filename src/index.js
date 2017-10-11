/** @jsx createElement */

/**
 * Inspired by react-side-effect
 * https://github.com/gaearon/react-side-effect
 */

import { Component, PureComponent, createElement } from 'rax';
import { isWeb, isWeex } from 'universal-env';

// assertFail
const assertFail = (expression, message) => {
  if (expression === true) {
    throw new Error(message);
  }
};

// getDisplayName
const getDisplayName = function getDisplayName(WrappedComponent) {
  // support functional component
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
};

const withSideEffect = function withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient,
  mapStateOnServer
) {
  // check reducePropsToState
  assertFail(
    typeof reducePropsToState !== 'function',
    'Expected reducePropsToState to be a function.'
  );

  // check handleStateChangeOnClient
  assertFail(
    typeof handleStateChangeOnClient !== 'function',
    'Expected handleStateChangeOnClient to be a function.'
  );

  // check mapStateOnServer
  assertFail(
    typeof mapStateOnServer !== 'undefined' && typeof mapStateOnServer !== 'function',
    'Expected mapStateOnServer to either be undefined or a function.'
  );

  return (WrappedComponent) => {
    let state,
      mountedInstances = [],
      componentDisplayName = getDisplayName(WrappedComponent);

    let emitChange = () => {
      // gathers current props across the whole tree
      state = reducePropsToState(mountedInstances.map(instance => instance.props));

      if (isWeb || isWeex) {
        // handle state on client
        // both weex and web
        handleStateChangeOnClient(state);
      } else if (mapStateOnServer) {
        // map state on server
        state = mapStateOnServer(state);
      }
    };

    class SideEffectComponent extends PureComponent {
      static displayName = `SideEffect(${componentDisplayName})`;

      // tag self if in one container
      static inContainer = (isWeb || isWeex);

      static peek() {
        return state;
      }

      static rewind() {
        if (SideEffectComponent.inContainer) {
          throw new Error('You may only call rewind() on the server. Call peek() to read the current state.');
        }

        let recordedState = state;
        state = undefined;
        mountedInstances = [];
        return recordedState;
      }

      componentWillMount() {
        mountedInstances.push(this);
        emitChange();
      }

      componentDidUpdate() {
        emitChange();
      }

      componentWillUnmount() {
        const index = mountedInstances.indexOf(this);
        mountedInstances.splice(index, 1);
        emitChange();
      }

      render() {
        return <WrappedComponent {...this.props} />;
      }
    }

    return SideEffectComponent;
  };
};

export default withSideEffect;
