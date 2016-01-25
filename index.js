import React from 'react-native';

const {
  StyleSheet,
  View,
  Component,
  Animated,
  PropTypes,
  PanResponder,
  Image,
} = React;

const SLIDE_RIGHT = -1;
const MIDDLE = 0;
const SLIDE_LEFT = 1;

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
  },
});

class SwipeOver extends Component {

  static propTypes = {
    onSwipeStart: PropTypes.func,
    onSwipeEnd: PropTypes.func,
    leftContainer: Image.propTypes.element.isRequired,
    rightContainer: Image.propTypes.element.isRequired,
  };

  static defaultProps = {
    onSwipeStart: () => {},
    onSwipeEnd: () => {},
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      translateX: props.swipeValue || new Animated.Value(0),
      width: 0,
      height: 0,
      scale: new Animated.Value(0),
      animatedHeight: null,
      swipeDirection: SLIDE_RIGHT,
    };
    this.state.translateX.addListener(({value}) => {
      if (value > 0 && this.state.swipeDirection === SLIDE_LEFT) {
        this.setState({swipeDirection: SLIDE_RIGHT});
      } else if (value < 0 && this.state.swipeDirection === SLIDE_RIGHT) {
        this.setState({swipeDirection: SLIDE_LEFT});
      }
    });
  }

  componentWillMount() {
    const release = (e, gestureState) => {
      this.animating = true;
      const containerWidth = this.state.width;
      const relativeGestureDistance = gestureState.dx / containerWidth;
      const vx = gestureState.vx;

      let swipeDirection = MIDDLE;
      if (relativeGestureDistance < -0.5 || (relativeGestureDistance < 0 && vx <= -1.5)) {
        swipeDirection = SLIDE_LEFT;
      } else if (relativeGestureDistance > 0.5 || (relativeGestureDistance > 0 && vx >= 1.5)) {
        swipeDirection = SLIDE_RIGHT;
      }

      // TODO manage gesture speed
      Animated.timing(this.state.translateX, {duration: 250, toValue: -swipeDirection * containerWidth}).start(() => {
        this.animating = false;
        this.props.onSwipeEnd(this._getSwipeAction(swipeDirection), this);
      });
      return false;
    };

    this._panResponder = PanResponder.create({
      // Claim responder if it's a horizontal pan
      onMoveShouldSetPanResponder: (e, gestureState) => {
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        if (this.animating || (dy > dx)) {
          return false;
        }
        const swipeDirection =  gestureState.dx > 0 ? SLIDE_RIGHT : SLIDE_LEFT;
        this.setState({swipeDirection});
        this.props.onSwipeStart(this._getSwipeAction(swipeDirection));
        return true;
      },

      // Touch is released, scroll to the one that you're closest to
      onPanResponderRelease: release,
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: release,

      /**
      * Here is the magic ! 💫🎩
      * Bind the dx gesture directly to xOffset. No JS !!!
      **/
      onPanResponderMove: Animated.event([null, {dx: this.state.translateX}]),

    });
  }

  render() {
    return (
      <Animated.View style={[{overflow: 'hidden'}, this.props.style, this.state.animatedHeight && {height: this.state.animatedHeight}]}>
        <View style={styles.absolute}>
          {this.renderActionsComponent()}
        </View>
        <Animated.View {...this._panResponder.panHandlers}
          onLayout={this._measureContainer.bind(this)}
          style={[{transform: [{translateX: this.state.translateX}]}, this.props.style]}>
          {this.props.children}
        </Animated.View>
      </Animated.View>
    );
  }

  renderActionsComponent() {
    if (this.state.swipeDirection === SLIDE_LEFT) {
      return this.props.rightContainer;
    }
    return this.props.leftContainer;
  }

  close(cb = () => {}) {
    this.animating = true;
    Animated.timing(this.state.translateX, {duration: 250, toValue: 0}).start(() => {
      this.animating = false;
      cb();
    });
  }

  // Should we really have this capacity here ?
  hide(cb = () => {}) {
    this.animating = true;
    Animated.timing(this.state.animatedHeight, {duration: 300, toValue: 0}).start(() => {
      this.animating = false;
      cb();
    });
  }

  _measureContainer({nativeEvent}) {
    const {width, height} = nativeEvent.layout;
    this.setState({width, height, animatedHeight: new Animated.Value(height)});
  }

  _getSwipeAction(step) {
    switch (step) {
      case SLIDE_RIGHT:
        return 'swipe:right';
      case MIDDLE:
        return 'closed';
      case SLIDE_LEFT:
        return 'swipe:left';
    }
  }

}

export default SwipeOver;
