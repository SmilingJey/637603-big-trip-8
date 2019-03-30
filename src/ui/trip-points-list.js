import Component from './component.js';
import * as moment from 'moment';
import {removeChilds} from '../utils/dom-utils.js';
import {calcDaysDiff, compareDate} from '../utils/date-utils.js';
import TripPoint from './trip-point.js';
import TripPointEdit from './trip-point-edit.js';
import {getTripStartDate} from '../utils/trip-utils.js';

/**
 * Класс описывает список отображения точек путешествия
 */
export default class TripPointsList extends Component {
  constructor({tripPointsData, destinationsData, availableOffersData}) {
    super();
    this._sortFunction = (point1, point2) => compareDate(point1.dateFrom, point2.dateFrom);
    this._filterFunction = null;
    this._tripPointEdit = null;
    this._tripPoints = [];
    this._tripPointsData = tripPointsData;
    this._destinationsData = destinationsData;
    this._availableOffersData = availableOffersData;
    this._message = ``;
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
   * Возвращает шаблон
   * @return {Node} - пустой шаблон списка точек маршрута
   */
  get template() {
    const element = document.createElement(`section`);
    element.classList.add(`trip-points`);
    return element;
  }

  /**
   * Возвращает отсортированный и отфильтрованный массив точек путешествия
   * @return {Array} - массив точек путешествия
   */
  getDisplayedPoints() {
    return this._sortPoints(this._filterPoints(this._getData()));
  }

  /**
   * Отображение списка точек путешествия
   */
  update() {
    this._unrenderContent();
    const displayedTripPoints = this.getDisplayedPoints();

    if (this._message) {
      this._element.appendChild(this._createMessage(this._message));
    }

    if (!displayedTripPoints || displayedTripPoints.length === 0) {
      return;
    }

    const tripPointsFragment = document.createDocumentFragment();
    const tripStartDate = getTripStartDate(this._getData());

    let prevTripPointDate = 0;
    let dayElement = null;
    for (const tripPointData of displayedTripPoints) {
      if (calcDaysDiff(prevTripPointDate, tripPointData.dateFrom) !== 0) {
        dayElement = this._createTripDayElement(tripPointData.dateFrom, tripStartDate);
        tripPointsFragment.appendChild(dayElement);
      }
      const tripPoint = this._createTripPoint(tripPointData);
      this._tripPoints.push(tripPoint);
      this._addTripPointElementToDayElement(dayElement, tripPoint.render());
      prevTripPointDate = tripPointData.dateFrom;
    }
    this._element.appendChild(tripPointsFragment);
  }

  /**
   * Отображает сообщение об ошибке
   */
  showErrorMessage() {
    this._message = `Something went wrong. Check your connection or try again later`;
    this.update();
  }

  /**
   * Отображает сообщение о загрузке данных
   */
  showLoadingMessage() {
    this._message = `Loading route...`;
    this.update();
  }

  /**
   * Скрывает сообщение
   */
  hideMessage() {
    this._message = ``;
    this.update();
  }

  /**
   * Открыть точку путешествия в режиме редактирования
   * @param {Object} tripPointData - данные точки путешествия
   */
  openTripPointInEditMode({id}) {
    const tripPoint = this._tripPoints.find((point) => point.data.id === id);
    if (tripPoint) {
      if (this._tripPointEdit) {
        this._tripPointEdit.cancelEdit();
      }
      this._tripPointEdit = this._createTripPointEdit(tripPoint.data);
      tripPoint.element.parentElement.replaceChild(this._tripPointEdit.render(), tripPoint.element);
      this._tripPoints.splice(this._tripPoints.indexOf(tripPoint), 1);
      tripPoint.unrender();
      try {
        this._tripPointEdit.element.scrollIntoView();
      } catch (err) {
        // console.log(err)
      }
    }
  }

  /**
   * Вохвращает данные точек путешествия
   * @return {Array}
   */
  _getData() {
    const data = this._tripPointsData.getTripPoints();
    return data === null ? [] : data;
  }

  /**
   * Возврацает массив точек путешествия, после применения заданного фильтра
   * @param {Array} array - исходный массив
   * @return {Array} - отфильтрованный массив
   */
  _filterPoints(array) {
    const hasFilterFunction = typeof this._filterFunction === `function`;
    return (hasFilterFunction) ? array.filter(this._filterFunction) : array;
  }

  /**
   * Возвращает отсортированный массив, после применения заданного способа сортировки
   * @param {Array} array - исходный массив
   * @return {Array} - отсортированный путешествия
   */
  _sortPoints(array) {
    const hasSortFunction = typeof this._sortFunction === `function`;
    return (hasSortFunction) ? array.sort(this._sortFunction) : array;
  }

  /**
   * Удаляет все точки путешествия
   */
  _unrenderContent() {
    if (this._tripPointEdit) {
      this._tripPointEdit.unrender();
      this._tripPointEdit = null;
    }
    for (const tripPoint of this._tripPoints) {
      tripPoint.unrender();
    }
    removeChilds(this._element);
  }

  /**
   * Сообщение для вывода на экран
   * @param {String} text - текст сообщения
   * @return {Node} - элемент с текстом
   */
  _createMessage(text) {
    const messageElement = document.createElement(`p`);
    messageElement.textContent = text;
    messageElement.classList.add(`trip-point-message`);
    if (!text) {
      messageElement.classList.add(`visually-hidden`);
    }
    return messageElement;
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
      this._tripPoints.splice(this._tripPoints.indexOf(tripPoint), 1);
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
    const tripPointEdit = new TripPointEdit({
      data,
      destinationsData: this._destinationsData,
      availableOffersData: this._availableOffersData,
    });

    // сохранение изменений
    tripPointEdit.onSubmit = (newData) => {
      tripPointEdit.savingBlock();
      this._tripPointsData.updateTripPoint(newData)
        .catch(() => {
          tripPointEdit.shake();
          tripPointEdit.changesUnsaved();
          tripPointEdit.unblock();
        });
    };

    // выход из режима редактирования
    tripPointEdit.onCancel = () => {
      const tripPoint = this._createTripPoint(data);
      tripPointEdit.element.parentElement.replaceChild(tripPoint.render(), tripPointEdit.element);
      tripPointEdit.unrender();
      this._tripPointEdit = null;
    };

    // удаление точки путешествия
    tripPointEdit.onDelete = () => {
      tripPointEdit.deletingBlock();
      this._tripPointsData.deleteTripPoint(data)
        .catch(() => {
          tripPointEdit.changesUnsaved();
          tripPointEdit.unblock();
        });
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