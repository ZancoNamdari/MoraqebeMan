from django.urls import path

from .views import (
    AssignmentBillingListView,
    AssignmentBillingUpdateView,
    CaregiverFinancialPerformanceView,
    FinanceOverviewView,
    InvoiceListCreateView,
    InvoiceStatusUpdateView,
    PaymentCreateView,
    ServiceTariffListCreateView,
    StaffFinancialPerformanceView,
)

urlpatterns = [
    path("agencies/<int:agency_id>/finance/tariffs/", ServiceTariffListCreateView.as_view(), name="finance-tariffs"),
    path("agencies/<int:agency_id>/finance/assignments/", AssignmentBillingListView.as_view(), name="finance-assignments"),
    path("agencies/<int:agency_id>/finance/assignments/<int:assignment_id>/", AssignmentBillingUpdateView.as_view(), name="finance-assignment-detail"),
    path("agencies/<int:agency_id>/finance/invoices/", InvoiceListCreateView.as_view(), name="finance-invoices"),
    path("agencies/<int:agency_id>/finance/invoices/<int:invoice_id>/", InvoiceStatusUpdateView.as_view(), name="finance-invoice-detail"),
    path("agencies/<int:agency_id>/finance/invoices/<int:invoice_id>/payments/", PaymentCreateView.as_view(), name="finance-invoice-payments"),
    path("agencies/<int:agency_id>/finance/overview/", FinanceOverviewView.as_view(), name="finance-overview"),
    path("agencies/<int:agency_id>/finance/performance/caregivers/", CaregiverFinancialPerformanceView.as_view(), name="finance-performance-caregivers"),
    path("agencies/<int:agency_id>/finance/performance/staff/", StaffFinancialPerformanceView.as_view(), name="finance-performance-staff"),
]
