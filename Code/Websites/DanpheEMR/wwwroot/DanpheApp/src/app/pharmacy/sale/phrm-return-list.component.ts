﻿import { Component, Injectable, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import * as moment from 'moment/moment';
import { PharmacyBLService } from "../shared/pharmacy.bl.service"

import PHRMGridColumns from '../shared/phrm-grid-columns';
import { GridEmitModel } from "../../shared/danphe-grid/grid-emit.model";
import { MessageboxService } from '../../shared/messagebox/messagebox.service';
import { PHRMInvoiceModel } from "../shared/phrm-invoice.model";
import { PHRMInvoiceItemsModel } from "../shared/phrm-invoice-items.model";
import { CommonFunctions } from "../../shared/common.functions";
import { PharmacyService } from "../shared/pharmacy.service"
import { SecurityService } from '../../security/shared/security.service';
import { PharmacyReceiptModel } from "../shared/pharmacy-receipt.model";
@Component({
    templateUrl: "../../view/pharmacy-view/Sale/PHRMSaleReturnList.html" //  "/PharmacyView/PHRMSaleReturnList"
})

export class PHRMReturnListComponent { //It save list of sale for grid
    public saleListData: Array<PHRMInvoiceModel> = new Array<PHRMInvoiceModel>();
    //variable for show invoice details with all items
    public saleInvoiceDetails: PHRMInvoiceModel = new PHRMInvoiceModel();
    // //It save InvoiceId with Invoice itmes details for local data access
    public saleInvoiceLocalData = new Array<{ InvoiceId: number, Invoice: PHRMInvoiceModel }>();
    public saleGridColumns: Array<any> = null;
    public showSaleItemsPopup: boolean = false;
    public pharmacyReceipt: PharmacyReceiptModel = new PharmacyReceiptModel();
    constructor(
        public router: Router, public pharmacyService: PharmacyService,
        public pharmacyBLService: PharmacyBLService,
        public msgBoxServ: MessageboxService,
        public changeDetector: ChangeDetectorRef,
        public securityService: SecurityService

    ) {
        this.LoadSaleInvoiceList();
        this.saleGridColumns = PHRMGridColumns.PHRMSaleList;
    }
    //Load sale invoice list
    LoadSaleInvoiceList(): void {
        try {
            this.pharmacyBLService.GetSaleReturnList()
                .subscribe(res => {
                    if (res.Status == 'OK') {
                        this.saleListData = res.Results;
                    }
                    else {
                        this.logError(res.ErrorMessage);
                    }
                },
                err => {
                    this.logError("failed to get patients")
                });
        }
        catch (exception) {
            this.ShowCatchErrMessage(exception);
        }
    }
    logError(err: any) {
        this.msgBoxServ.showMessage("error", [err]);
        console.log(err);
    }
    //Grid actions fires this method
    SaleReturnListGridActions($event: GridEmitModel) {
        try {
            switch ($event.Action) {
                case "view": {
                    if ($event.Data != null) {
                        var selectedSaleInvoiceData = $event.Data;
                        this.ShowSaleInvoiceDetail(selectedSaleInvoiceData);
                    }
                    break;
                }
                case "saleCredit": {
                    if ($event.Data != null) {
                        var data = $event.Data;
                        this.ShowSaleCreditInvoiceDetail(data.InvoiceId);
                    }
                    break;
                }
                default:
                    break;
            }
        }
        catch (exception) {
            this.ShowCatchErrMessage(exception);
        }
    }

    ShowSaleCreditInvoiceDetail(InvoiceId) {
        //Pass the Purchase order Id  to Next page for getting PUrchaserOrderItems using inventoryService
        this.pharmacyService.Id = InvoiceId;
        this.router.navigate(['/Pharmacy/Sale/SaleCredit']);
    }

    //Method to show details of single sale invoice
    public ShowSaleInvoiceDetail(selectedSaleInvoiceData) {
        try {
            if (selectedSaleInvoiceData) {
                this.saleInvoiceDetails = selectedSaleInvoiceData;              
                //find invoice details in locl variable if find then no need to go server
                let saleInvoiceDetailsSearchData = this.saleInvoiceLocalData.find(a => a.InvoiceId == this.saleInvoiceDetails.InvoiceId);
                if (saleInvoiceDetailsSearchData) {
                    this.showSaleItemsPopup = true;
                    this.saleInvoiceDetails = saleInvoiceDetailsSearchData.Invoice;
                    this.printReceipt(this.saleInvoiceDetails);
                }
                else {
                    if (this.saleInvoiceDetails.InvoiceId) {
                        this.pharmacyBLService.GetSaleInvoiceItemsByInvoiceId(this.saleInvoiceDetails.InvoiceId)
                            .subscribe(res => {
                                if (res.Status == 'OK') {
                                    this.showSaleItemsPopup = true;
                                    this.saleInvoiceDetails.InvoiceItems = res.Results;
                                    let tempInvoice = { InvoiceId: this.saleInvoiceDetails.InvoiceId, Invoice: this.saleInvoiceDetails };
                                    this.saleInvoiceLocalData.push(tempInvoice);
                                    this.printReceipt(this.saleInvoiceDetails);
                                }
                                else {
                                    this.showSaleItemsPopup = false;
                                    this.logError(res.ErrorMessage);
                                }
                            },
                            err => {
                                this.showSaleItemsPopup = false;
                                this.logError("failed to get invoice items")
                            });
                    }
                }
            }
        }
        catch (exception) {
            this.ShowCatchErrMessage(exception);
        }
    }
    //This function only for show catch messages in console 
    ShowCatchErrMessage(exception) {
        if (exception) {
            let ex: Error = exception;
            console.log("Error Messsage =>  " + ex.message);
            console.log("Stack Details =>   " + ex.stack);
        }
    }
    Close() {
        this.showSaleItemsPopup = false;
    }

    printReceipt(invoiceItemData) {
        try {
            if (invoiceItemData) {
                let txnReceipt = PharmacyReceiptModel.GetReceiptForTransaction(invoiceItemData);
                txnReceipt.IsValid = true;
                txnReceipt.ReceiptType = "Sale Return Receipt";
                txnReceipt.IsReturned = true;
                txnReceipt.BillingUser = this.securityService.GetLoggedInUser().UserName;
                txnReceipt.Patient = invoiceItemData.Patient;// this.currSale.selectedPatient;
                this.pharmacyService.globalPharmacyReceipt = txnReceipt;
                this.pharmacyReceipt = this.pharmacyService.globalPharmacyReceipt;
                this.showSaleItemsPopup = true;
            }
            else {
                this.msgBoxServ.showMessage("failed", ['no data,please try again']);
            }
        }
        catch (exception) {
            this.ShowCatchErrMessage(exception);
        }

    }
}