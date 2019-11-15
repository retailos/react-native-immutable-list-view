import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Text, InteractionManager } from 'react-native';
import { ListView } from 'deprecated-react-native-listview';


import styles from '../styles';
import utils from '../utils';

// ListView renders EmptyListView which renders an empty ListView. Cycle is okay here.
// eslint-disable-next-line import/no-cycle
import { EmptyListView } from './EmptyListView';

/**
 * A ListView capable of displaying {@link https://facebook.github.io/immutable-js/ Immutable} data
 * out of the box.
 */
class ImmutableListView extends PureComponent {
  static propTypes = {
    /**
     * An instance of [ListView.DataSource](docs/listviewdatasource.html) to use
     */
    dataSource: PropTypes.instanceOf(ListViewDataSource).isRequired,
    /**
     * (sectionID, rowID, adjacentRowHighlighted) => renderable
     *
     * If provided, a renderable component to be rendered as the separator
     * below each row but not the last row if there is a section header below.
     * Take a sectionID and rowID of the row above and whether its adjacent row
     * is highlighted.
     */
    renderSeparator: PropTypes.func,
    /**
     * (rowData, sectionID, rowID, highlightRow) => renderable
     *
     * Takes a data entry from the data source and its ids and should return
     * a renderable component to be rendered as the row. By default the data
     * is exactly what was put into the data source, but it's also possible to
     * provide custom extractors. ListView can be notified when a row is
     * being highlighted by calling `highlightRow(sectionID, rowID)`. This
     * sets a boolean value of adjacentRowHighlighted in renderSeparator, allowing you
     * to control the separators above and below the highlighted row. The highlighted
     * state of a row can be reset by calling highlightRow(null).
     */
    renderRow: PropTypes.func.isRequired,
    /**
     * How many rows to render on initial component mount. Use this to make
     * it so that the first screen worth of data appears at one time instead of
     * over the course of multiple frames.
     */
    initialListSize: PropTypes.number.isRequired,
    /**
     * Called when all rows have been rendered and the list has been scrolled
     * to within onEndReachedThreshold of the bottom. The native scroll
     * event is provided.
     */
    onEndReached: PropTypes.func,
    /**
     * Threshold in pixels (virtual, not physical) for calling onEndReached.
     */
    onEndReachedThreshold: PropTypes.number.isRequired,
    /**
     * Number of rows to render per event loop. Note: if your 'rows' are actually
     * cells, i.e. they don't span the full width of your view (as in the
     * ListViewGridLayoutExample), you should set the pageSize to be a multiple
     * of the number of cells per row, otherwise you're likely to see gaps at
     * the edge of the ListView as new pages are loaded.
     */
    pageSize: PropTypes.number.isRequired,
    /**
     * () => renderable
     *
     * The header and footer are always rendered (if these props are provided)
     * on every render pass. If they are expensive to re-render, wrap them
     * in StaticContainer or other mechanism as appropriate. Footer is always
     * at the bottom of the list, and header at the top, on every render pass.
     * In a horizontal ListView, the header is rendered on the left and the
     * footer on the right.
     */
    renderFooter: PropTypes.func,
    renderHeader: PropTypes.func,
    /**
     * (sectionData, sectionID) => renderable
     *
     * If provided, a header is rendered for this section.
     */
    renderSectionHeader: PropTypes.func,
    /**
     * (props) => renderable
     *
     * A function that returns the scrollable component in which the list rows
     * are rendered. Defaults to returning a ScrollView with the given props.
     */
    renderScrollComponent: PropTypes.func.isRequired,
    /**
     * How early to start rendering rows before they come on screen, in
     * pixels.
     */
    scrollRenderAheadDistance: PropTypes.number.isRequired,
    /**
     * (visibleRows, changedRows) => void
     *
     * Called when the set of visible rows changes. `visibleRows` maps
     * { sectionID: { rowID: true }} for all the visible rows, and
     * `changedRows` maps { sectionID: { rowID: true | false }} for the rows
     * that have changed their visibility, with true indicating visible, and
     * false indicating the view has moved out of view.
     */
    onChangeVisibleRows: PropTypes.func,
    /**
     * A performance optimization for improving scroll perf of
     * large lists, used in conjunction with overflow: 'hidden' on the row
     * containers. This is enabled by default.
     */
    removeClippedSubviews: PropTypes.bool,
    /**
     * Makes the sections headers sticky. The sticky behavior means that it
     * will scroll with the content at the top of the section until it reaches
     * the top of the screen, at which point it will stick to the top until it
     * is pushed off the screen by the next section header. This property is
     * not supported in conjunction with `horizontal={true}`. Only enabled by
     * default on iOS because of typical platform standards.
     */
    stickySectionHeadersEnabled: PropTypes.bool,
    /**
     * An array of child indices determining which children get docked to the
     * top of the screen when scrolling. For example, passing
     * `stickyHeaderIndices={[0]}` will cause the first child to be fixed to the
     * top of the scroll view. This property is not supported in conjunction
     * with `horizontal={true}`.
     */
    stickyHeaderIndices: PropTypes.arrayOf(PropTypes.number).isRequired,
    /**
     * Flag indicating whether empty section headers should be rendered. In the future release
     * empty section headers will be rendered by default, and the flag will be deprecated.
     * If empty sections are not desired to be rendered their indices should be excluded from sectionID object.
     */
    enableEmptySections: PropTypes.bool,

    // ImmutableListView handles creating the dataSource, so don't allow it to be passed in.
    dataSource: PropTypes.oneOf([undefined]),

    /**
     * The immutable data to be rendered in a ListView.
     */
    // eslint-disable-next-line consistent-return
    immutableData: (props, propName, componentName) => {
      // Note: It's not enough to simply validate PropTypes.instanceOf(Immutable.Iterable),
      // because different imports of Immutable.js across files have different class prototypes.
      if (!utils.isImmutableIterable(props[propName])) {
        return new Error(`Invalid prop ${propName} supplied to ${componentName}: Must be instance of Immutable.Iterable.`);
      }
    },

    /**
     * A function taking (prevSectionData, nextSectionData)
     * and returning true if the section header will change.
     */
    sectionHeaderHasChanged: PropTypes.func,

    /**
     * How many rows of data to display while waiting for interactions to finish (e.g. Navigation animations).
     * You can use this to improve the animation performance of longer lists when pushing new routes.
     *
     * @see https://facebook.github.io/react-native/docs/performance.html#slow-navigator-transitions
     */
    rowsDuringInteraction: PropTypes.number,

    /**
     * A plain string, or a function that returns some {@link PropTypes.element}
     * to be rendered in place of a `ListView` when there are no items in the list.
     *
     * Things like pull-refresh functionality will be lost unless explicitly supported by your custom component.
     * Consider `renderEmptyInList` instead if you want this.
     *
     * It will be passed all the original props of the ImmutableListView.
     */
    renderEmpty: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),

    /**
     * A plain string, or a function that returns some {@link PropTypes.element}
     * to be rendered inside of an `EmptyListView` when there are no items in the list.
     *
     * This allows pull-refresh functionality to be preserved.
     *
     * It will be passed all the original props of the ImmutableListView.
     */
    renderEmptyInList: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  };

  static defaultProps = {
    ...ListView.defaultProps,

    // The data contained in the section generally doesn't affect the header text, so return false.
    // eslint-disable-next-line no-unused-vars
    sectionHeaderHasChanged: (prevSectionData, nextSectionData) => false,

    // Note: enableEmptySections is being used to mimic the default behavior of the upcoming version.
    enableEmptySections: true,

    // Note: removeClippedSubviews is disabled to work around a long-standing bug:
    //   https://github.com/facebook/react-native/issues/1831
    removeClippedSubviews: false,

    renderEmptyInList: 'No data.',
  };

  state = {
    dataSource: new ListView.DataSource({
      rowHasChanged: (prevRowData, nextRowData) => !Immutable.is(prevRowData, nextRowData),

      getRowData: (dataBlob, sectionID, rowID) => {
        const rowData = utils.getValueFromKey(sectionID, dataBlob);
        return utils.getValueFromKey(rowID, rowData);
      },

      // eslint-disable-next-line react/destructuring-assignment
      sectionHeaderHasChanged: this.props.sectionHeaderHasChanged,

      getSectionHeaderData: (dataBlob, sectionID) => utils.getValueFromKey(sectionID, dataBlob),
    }),

    interactionOngoing: true,
  };

  componentWillMount() {
    this.canSetState = true;
    this.setStateFromPropsAfterInteraction(this.props);
  }

  componentWillReceiveProps(newProps) {
    this.setStateFromPropsAfterInteraction(newProps);
  }

  componentWillUnmount() {
    this.canSetState = false;
  }

  setStateFromPropsAfterInteraction(props) {
    // Always set state right away before the interaction.
    this.setStateFromProps(props, false);

    // If set, wait for animations etc. to complete before rendering the full list of data.
    if (props.rowsDuringInteraction >= 0) {
      InteractionManager.runAfterInteractions(() => {
        this.setStateFromProps(props, true);
      });
    }
  }

  setStateFromProps(props, interactionHasJustFinished) {
    // In some cases the component will have been unmounted before executing
    // InteractionManager.runAfterInteractions, causing a warning if we try to set state.
    if (!this.canSetState) return;

    const { dataSource, interactionOngoing } = this.state;
    const { immutableData, rowsDuringInteraction, renderSectionHeader } = props;

    const shouldDisplayPartialData = rowsDuringInteraction >= 0 && interactionOngoing && !interactionHasJustFinished;

    const displayData = (shouldDisplayPartialData
      ? immutableData.slice(0, rowsDuringInteraction)
      : immutableData);

    const updatedDataSource = (renderSectionHeader
      ? dataSource.cloneWithRowsAndSections(
        displayData, utils.getKeys(displayData), utils.getRowIdentities(displayData),
      )
      : dataSource.cloneWithRows(
        displayData, utils.getKeys(displayData),
      ));

    this.setState({
      dataSource: updatedDataSource,
      interactionOngoing: interactionHasJustFinished ? false : interactionOngoing,
    });
  }

  getListView() {
    return this.listViewRef;
  }

  getMetrics = (...args) =>
    this.listViewRef && this.listViewRef.getMetrics(...args);

  scrollTo = (...args) =>
    this.listViewRef && this.listViewRef.scrollTo(...args);

  scrollToEnd = (...args) =>
    this.listViewRef && this.listViewRef.scrollToEnd(...args);

  renderEmpty() {
    const {
      immutableData, enableEmptySections, renderEmpty, renderEmptyInList, contentContainerStyle,
    } = this.props;

    const shouldTryToRenderEmpty = renderEmpty || renderEmptyInList;
    if (shouldTryToRenderEmpty && utils.isEmptyListView(immutableData, enableEmptySections)) {
      if (renderEmpty) {
        if (typeof renderEmpty === 'string') {
          return <Text style={[styles.emptyText, contentContainerStyle]}>{renderEmpty}</Text>;
        }
        return renderEmpty(this.props);
      }
      if (renderEmptyInList) {
        if (typeof renderEmptyInList === 'string') {
          const { renderRow, ...passThroughProps } = this.props;
          return <EmptyListView {...passThroughProps} emptyText={renderEmptyInList} />;
        }
        return <EmptyListView {...this.props} renderRow={() => renderEmptyInList(this.props)} />;
      }
    }

    return null;
  }

  render() {
    const { dataSource } = this.state;
    const {
      immutableData, renderEmpty, renderEmptyInList, rowsDuringInteraction, sectionHeaderHasChanged, ...passThroughProps
    } = this.props;

    return this.renderEmpty() || (
      <ListView
        ref={(component) => { this.listViewRef = component; }}
        dataSource={dataSource}
        {...passThroughProps}
      />
    );
  }
}

export default ImmutableListView;
