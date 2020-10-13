'use strict';

require('./event-utils.js');
require('./cal-default-value.service.js');
require('../app.constants');

angular.module('esn.calendar.libs')
  .service('calUIAuthorizationService', calUIAuthorizationService);

function calUIAuthorizationService(
  $q,
  calEventUtils,
  calDefaultValue
) {

  return {
    canAccessEventDetails,
    canDeleteCalendar,
    canExportCalendarIcs,
    canImportCalendarIcs,
    canModifyCalendarProperties,
    canModifyEvent,
    canModifyEventAttendees,
    canModifyEventRecurrence,
    canModifyPublicSelection,
    canShowDelegationTab
  };

  ////////////

  function canAccessEventDetails(calendar, event, userId) {
    // If user is attendee or organizer of an event, event is on own user calendar
    return !!calendar && !!event && (calendar.isOwner(userId) || (event.isPublic() && calendar.isReadable(userId)));
  }

  function canDeleteCalendar(calendar, userId) {
    return !!calendar && (calendar.id !== calDefaultValue.get('calendarId')) && canModifyCalendarProperties(calendar, userId);
  }

  function canExportCalendarIcs(calendar, userId) {
    return !!calendar && calendar.isReadable(userId);
  }

  function canImportCalendarIcs(calendar, userId) {
    return !!calendar && calendar.isOwner(userId) && !calendar.isSubscription();
  }

  function canModifyEvent(calendar, event, userId) {
    if (!!event && calEventUtils.isNew(event)) {
      return $q.when(true);
    }

    return _canModifyEvent(calendar, event, userId);
  }

  /**
   * @name canModifyEventAttendees
   * @description Check user permission to modify (add/remove) attendees of an event
   *  To modify the attendees of an event list, a user must be satisfied with one of three conditions:
   *  - User is the owner of a calendar and the organizer of the event on the calendar
   *  - User is the sharee of the calendar and has the write permission
   *  - The calendar is published with write permission and the user subscribes to the calendar
   * @param  {CalendarCollectionShell}    calendar     a shell that wraps caldav calendar component
   * @param  {CalendarShell}              event        a shell that wraps an ical.js VEVENT component
   * @param  {string}                     userId       id of the user who needs to be checked
   * @return {Boolean}                    true if the user can modify attendees of the provided event, otherwise, return false.
   */

  function canModifyEventAttendees(calendar, event, userId) {
    var canModifyAsOwnerAndOrganizer = !!event && _isOrganizerAndOwner(calendar, event, userId);

    if (canModifyAsOwnerAndOrganizer) return true;

    var canModifySubscribedCalendar = (calendar.isShared(userId) || calendar.isSubscription()) && calendar.isWritable(userId);

    return canModifySubscribedCalendar;
  }

  function canModifyEventRecurrence(calendar, event, userId) {
    if (!event || event.isInstance()) {
      return $q.when(false);
    }

    return _canModifyEvent(calendar, event, userId);
  }

  function canModifyPublicSelection(calendar, userId) {
    return _isAdminForCalendar(calendar, userId);
  }

  function canModifyCalendarProperties(calendar, userId) {
    // the owner of a Subscription is not the same the current user, so we need to check for calendar.isSubscription()
    // to allow the user to unsubscribe from a public calendar
    return !!calendar && (calendar.isOwner(userId) || calendar.isShared(userId) || calendar.isSubscription());
  }

  function canShowDelegationTab(calendar, userId) {
    return _isAdminForCalendar(calendar, userId);
  }

  function _isAdminForCalendar(calendar, userId) {
    return !!calendar && calendar.isAdmin(userId) && !calendar.isSubscription();
  }

  function _isOrganizerAndOwner(calendar, event, userId) {
    return calendar.isOwner(userId) && calEventUtils.isOrganizer(event);
  }

  function _isOwnerOrganizer(calendar, event) {
    return calendar.getOwner().then(function(owner) {
      return calEventUtils.isOrganizer(event, owner);
    });
  }

  function _canModifyEvent(calendar, event, userId) {
    if (!!calendar && !!event) {
      return _isOwnerOrganizer(calendar, event)
        .then(isEventOrganiser => isEventOrganiser && calendar.isWritable(userId));
    }

    return $q.when(false);
  }
}
