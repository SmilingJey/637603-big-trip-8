import Component from './component.js';
import * as moment from 'moment';
import {removeChilds} from './utils/dom-utils.js';
import {calcDaysDiff, compareDate} from './utils/date-utils.js';
import TripPoint from './trip-point.js';
import TripPointEdit from './trip-point-edit.js';
import createMockTripPoint from './mock-trip-point.js';

/**
 * Класс описывает список отображения точек путешествия
 */
export default class TripPointsList extends Component {
  constructor() {
    super();
    this._tripPointsData = Array(20).fill().map(createMockTripPoint);
    this._sortFunction = (point1, point2) => compareDate(point1.date, point2.date);
    this._filterFunction = null;
    this._tripPointEdit = null;
    this._tripPoints = [];
    this.getData = this.getData.bind(this);
  }

  /**
   * Задает алгоритм сортировки точек путешествия
   * @param {Function} fn - функция сравнения точек для использования sort
   */
  set sortFunction(fn) {
    this._sortFunction = fn;
    this.update();
  }

  /**
   * Задает алгоритм фильтрации точек путешествия
   * @param {Function} fn - функция фильтрации точек для использования filter
   */
  set filterFunction(fn) {
    this._filterFunction = fn;
    this.update();
  }

  /**
   * Вохвращает данные точек путешествия
   * @return {Array}
   */
  getData() {
    return this._tripPointsData;
  }

  /**
   * Возврацает массив точек путешествия, после применения заданного фильтра
   * @param {Array} array - исходный массив
   * @return {Array} - отфильтрованный массив
   */
  filterPoints(array) {
    const hasFilterFunction = typeof this._filterFunction === `function`;
    return (hasFilterFunction) ? array.filter(this._filterFunction) : array;
  }

  /**
   * Возвращает отсортированный массив, после применения заданного способа сортировки
   * @param {Array} array - исходный массив
   * @return {Array} - отсортированный путешествия
   */
  sortPoints(array) {
    const hasSortFunction = typeof this._sortFunction === `function`;
    return (hasSortFunction) ? array.sort(this._sortFunction) : array;
  }

  /**
   * Возвращает отсортированный и отфильтрованный массив точек путешествия
   * @return {Array} - массив точек путешествия
   */
  getDisplayedPoints() {
    return this.sortPoints(this.filterPoints(this._tripPointsData));
  }

  /**
   * Возвращает шаблон
   * @return {Node} - пустой шаблон списка точек маршрута
   */
  get template() {
    const element = document.createElement(`section`);
    element.classList.add(`trip-points`);
    return element;
  }

  /**
   * Отображение списка точек путешествия
   */
  update() {
    this._removeTripPoints();
    removeChilds(this._element);
    const displayedTripPoints = this.getDisplayedPoints();

    if (displayedTripPoints.length === 0) {
      return;
    }

    const tripPointsFragment = document.createDocumentFragment();
    const tripStartDate = this._getTripStartDate();

    let prevTripPointDate = 0;
    let dayElement = null;
    for (const tripPointData of displayedTripPoints) {
      if (calcDaysDiff(prevTripPointDate, tripPointData.date) !== 0) {
        dayElement = this._createTripDayElement(tripPointData.date, tripStartDate);
        tripPointsFragment.appendChild(dayElement);
      }
      const tripPoint = this._createTripPoint(tripPointData);
      this._tripPoints.push(tripPoint);
      this._addTripPointElementToDayElement(dayElement, tripPoint.render());
      prevTripPointDate = tripPointData.date;
    }

    this._element.appendChild(tripPointsFragment);
  }

  /**
   * Удаляет все точки путешествия
   */
  _removeTripPoints() {
    for (const tripPoint of this._tripPoints) {
      tripPoint.unrender();
    }
  }

  /**
   * Возвращает дату начала путешествия
   * @return {Node} - дата начала путешествия
   */
  _getTripStartDate() {
    return this._tripPointsData.reduce((min, point) => point.date < min ? point.date : min, Infinity);
  }

  /**
   * Создает объект точки путешествия и задает ей переход в режим редактирования
   * @param {Object} data - описание точки путешествия
   * @return {Object} объект точки путешествия
   */
  _createTripPoint(data) {
    const tripPoint = new TripPoint(data);
    tripPoint.onEdit = () => {
      if (this._tripPointEdit) {
        this._tripPointEdit.cancelEdit();
      }
      this._tripPointEdit = this._createTripPointEdit(data);
      tripPoint.element.parentElement.replaceChild(this._tripPointEdit.render(), tripPoint.element);
      tripPoint.unrender();
    };
    return tripPoint;
  }

  /**
   * Создает объект точки путешествия в режиме редактирования
   * @param {*} data - описание точки путешествия
   * @return {Object} объект точки путешествия в режиме редактирования
   */
  _createTripPointEdit(data) {
    const tripPointEdit = new TripPointEdit(data);

    tripPointEdit.onSubmit = (newData) => {
      this._tripPointsData[this._tripPointsData.indexOf(data)] = newData;
      if (!moment(newData.date).isSame(data.date) ||
          !moment(newData.startTime).isSame(data.startTime)) {
        this.update();
      } else {
        const tripPoint = this._createTripPoint(newData);
        tripPointEdit.element.parentElement.replaceChild(tripPoint.render(), tripPointEdit.element);
      }
      tripPointEdit.unrender();
      this._tripPointEdit = null;
    };

    tripPointEdit.onCancel = () => {
      const tripPoint = this._createTripPoint(data);
      tripPointEdit.element.parentElement.replaceChild(tripPoint.render(), tripPointEdit.element);
      tripPointEdit.unrender();
      this._tripPointEdit = null;
    };

    tripPointEdit.onDelete = () => {
      this._tripPointsData.splice(this._tripPointsData.indexOf(data), 1);
      tripPointEdit.unrender();
      this.update();
      this._tripPointEdit = null;
    };
    return tripPointEdit;
  }

  /**
   * Создает элемент дня путешествия
   * @param {Date} date - дата дня путешествия
   * @param {Date} tripStartDate - дата дня начала путешествия
   * @return {Node} - элемент дня путешествия
   */
  _createTripDayElement(date, tripStartDate) {
    const tripDayTemplate = document.querySelector(`#trip-day-template`);
    const dayElement = tripDayTemplate.content.querySelector(`.trip-day`).cloneNode(true);
    const dayNumberElement = dayElement.querySelector(`.trip-day__number`);
    const dayNumber = calcDaysDiff(tripStartDate, date) + 1;
    dayNumberElement.textContent = dayNumber;
    const dayTitleElement = dayElement.querySelector(`.trip-day__title`);
    dayTitleElement.textContent = moment(date).format(`MMM D`);
    return dayElement;
  }

  /**
   * Добавляет элемент точки путешестия в элемент дня путешествия
   * @param {Node} dayElement - элемент дня путешествия
   * @param {Node} tripPoinElement - элемент точки путешествия
   */
  _addTripPointElementToDayElement(dayElement, tripPoinElement) {
    const tripPointsConteinerElement = dayElement.querySelector(`.trip-day__items`);
    tripPointsConteinerElement.appendChild(tripPoinElement);
  }
}
