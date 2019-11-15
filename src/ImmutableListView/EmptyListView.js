import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Text } from 'react-native';
import { ListView } from 'deprecated-react-native-listview';

// ListView renders EmptyListView which renders an empty ListView. Cycle is okay here.
// eslint-disable-next-line import/no-cycle
import ImmutableListView from './ImmutableListView';

import styles from '../styles';
import utils from '../utils';

/**
 * A ListView that displays a single item showing that there is nothing to display.
 * Useful e.g. for preserving the ability to pull-refresh an empty list.
 */
class EmptyListView extends PureComponent {
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

    // Make this prop optional instead of required.
    renderRow: PropTypes.func,

    emptyText: PropTypes.string,
  };

  static defaultProps = {
    ...ListView.defaultProps,

    emptyText: 'No data.',
  };

  state = {
    listData: utils.UNITARY_LIST,
  };

  componentWillMount() {
    this.setListDataFromProps(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.setListDataFromProps(nextProps);
  }

  setListDataFromProps(props) {
    const { listData } = this.state;
    const { renderEmpty, renderEmptyInList, emptyText } = props;

    // Update the data to make sure the list re-renders if any of the relevant props have changed.
    this.setState({
      listData: listData.set(0, Immutable.fromJS([renderEmpty, renderEmptyInList, emptyText])),
    });
  }

  /**
   * Returns a simple text element showing the `emptyText` string.
   * This method can be overridden by passing in your own `renderRow` prop instead.
   */
  renderRow() {
    const { emptyText } = this.props;

    return (
      <Text style={styles.emptyText}>
        {emptyText}
      </Text>
    );
  }

  render() {
    const { listData } = this.state;
    const {
      renderEmpty, renderEmptyInList, renderSectionHeader, emptyText, ...passThroughProps
    } = this.props;

    return (
      <ImmutableListView
        renderRow={() => this.renderRow()}
        {...passThroughProps}
        immutableData={listData}
      />
    );
  }
}

export { EmptyListView };
