
import { Injectable } from '@angular/core';
// import { MikroWizardrpcProvider } from '../MikroWizardrpc/MikroWizardrpc';
import { MikroWizardProvider } from './provider';


import { User } from './user';

@Injectable()
export class dataProvider {
    
    // public serverUrl: string = "/api";
    public serverUrl: string = "";
    private db: string = "NothingImportant";

    constructor(
        // private http: HTTP,
        // public MikroWizardRPC: MikroWizardrpcProvider,
        public MikroWizardRPC: MikroWizardProvider,
    ) {
        this.MikroWizardRPC.init({
            MikroWizard_server: this.serverUrl
        });
    }

    isLoggedIn() {
        return this.MikroWizardRPC.isLoggedIn();
    }

    login(username: string = "", password: string = "", ga: string = "") {
        var _self = this;
        this.MikroWizardRPC.clearCookeis();
        return this.MikroWizardRPC.login(this.db, username, password, ga).then(res => {
            if ('uid' in res && res['uid']) {
                let usr: User = new User(
                    res.name,
                    res.username,
                    res.partner_id,
                    res.uid,
                    res.first_name,
                    res.last_name,
                    res.role,
                    res.perms,
                    res.tz,
                );
                // console.dir(JSON.stringify(usr))
                localStorage.setItem('current_user', JSON.stringify(usr));
            }
            return res;
        });
    }

    logout() {
        var _self = this;
        _self.MikroWizardRPC.clearCookeis();
        this.MikroWizardRPC.setNewSession('', '');
        localStorage.removeItem('current_user');
        return this.MikroWizardRPC.sendJsonRequest("/api/logout", {});
    }

    ////
    //// MikroWizard API 
    ////
    get_front_version(){
        return this.MikroWizardRPC.sendHttpGetRequest("/api/frontver/");
    }
    change_password(oldpass:string,newpass:string){
        var data={
            'oldpass':oldpass,
            'newpass':newpass
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/change_password", data);
    }
    dashboard_stats(versioncheck:boolean){
        var data={
            'versioncheck':versioncheck
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dashboard/stats", data);
    }
    monitoring_devices_events(page:number,textfilter:string=''){
        var data={
            'page':page,
            'textfilter':textfilter
        }
  
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/devs/get", data);
    }
    
    monitoring_events_fix(event_id:number){
        var data={
            'event_id':event_id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/events/fix", data);
    }
  
    monitoring_all_events(devid:number,page:number){
        var data={
            'devid':devid,
            'page':page
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/events/get", data);
    }
    monitoring_unfixed_events(devid:number){
        var data={
            'devid':devid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/eventunfixed/get", data);
    }
    dashboard_traffic(delta:string){
        var data={
            'delta':delta
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dashboard/traffic", data);
    }

    get_dev_list(data:any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/list", data);
    }

    get_devgroup_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/list", {});
    }

    get_devgroup_members(gid:number) {
        var data={
            'gid':gid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/members", data);
    }
    delete_group(id:number){
        var data={
            'gid':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/delete", data);
    }

    delete_devices(devids:any){ 
        var data = {
            'devids':devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/delete", data);
    }

    get_dev_info(id: number) {
        var data={
            'devid':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/info", data);
    }

    get_editform(id: number) {
        var data={
            'devid':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/get_editform", data);
    }
    save_editform(data:any){
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/save_editform", data);
    }
    get_dev_sensors(id: number,delta:string="5m",total_type:string="bps") {
        var data={
            'devid':id,
            'delta':delta,
            'total':total_type
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/sensors", data);
    }
    get_dev_radio_sensors(id: number, delta:string="5m"){
        var data={
            'devid':id,
            'delta':delta
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/radio/sensors", data);
    }
    get_dev_ifstat(id: number,delta:string="5m",iface:string="ether1",type:string="bps") {
        var data={
            'devid':id,
            'delta':delta,
            'type':type,
            'interface':iface
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/ifstat", data);
    }

    get_auth_logs(filters:any) {
        var data=filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/auth/list", data);
    }

    get_account_logs(filters:any) {
        var data=filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/account/list", data);
    }

    get_dev_logs(filters:any) {
        var data=filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/devlogs/list", data);
    }

    get_syslog(filters:any) {
        var data=filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/syslog/list", data);
    }
    get_details_grouped(devid:number=0){
        var data={
            'devid':devid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devlogs/details/list", data);
    }

    scan_devs(type:string,info:any){
        var data: any={
            'type':type
        }
        if(type=="ip"){
            data = Object.assign(data, info);
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/scanner/scan", data);
    }

    scan_results(){
        return this.MikroWizardRPC.sendJsonRequest("/api/scanner/results", {});
    }

	get_groups(searchstr:string=""){
        var data={
            'searchstr':searchstr
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/search/groups", data);
	}

	get_devices(searchstr:string=""){
        var data={
            'searchstr':searchstr
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/search/devices", data);
	}

    update_save_group(group:any){
        var data={
            ...group
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/update_save_group", data);
    }

    get_snippets(name:string,desc:string,content:string,page:number=0,size:number=1000){
        var data={
            'name':name,
            'description':desc,
            'content':content, 
            'page':page,
            'size':size
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/list", data);
    }

    save_snippet(data:any){
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/save", {...data});
    }

    Exec_snipet(data:any,members:any) {
        data['members']=members;
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/exec", data);
    }

    delete_snippet(id:number){
        var data={
            'id':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/delete", data);
    }
    get_executed_snipet(id:number){
        var data={
            'id':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/executed", data);
    }
    get_user_task_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/list", {});
    }


    Add_task(data:any,members:any) {
        data['members']=members;
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/create", data);
    }
    

    Delete_task(taskid:Number) {
        var data={
            'taskid':taskid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/delete", data);
    }

    Edit_task(data:any,members:any) {
        data['members']=members;
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/edit", data);
    }
    
    get_task_members(taskid:Number) {
        var data={
            'taskid':taskid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/taskmember/details", data);
    }


    get_users(page:Number,size:Number,search:string) {
        var data={
            'page':page,
            'size':size,
            'search':search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/users/list", data);
    }

    get_perms(page:Number,size:Number,search:string) {
        var data={
            'page':page,
            'size':size,
            'search':search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/list", data);
    }
    
    create_perm(name:string,perms:any) {
        var data={
            'name':name,
            'perms':perms
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/create", data);
    }

    edit_perm(id:Number,name:string,perms:any) {
        
        var data = {
            'id':id,
            'name':name,
            'perms':perms
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/perms/edit", data);
    }
    
    delete_perm(id:number){
        var data={
            'id':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/delete", data);
    }

    user_perms(uid:string) {
        
        var data = {
            'uid':uid,
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/list", data);
    }

    Add_user_perm(uid:Number,permid:Number,devgroupid:Number){

        var data = {
            'uid':uid,
            'pid':permid,
            'gid':devgroupid
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/create", data);
    }
    Delete_user_perm(id:number){
        var data={
            'id':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/delete", data);
    }
    edit_user(data:any) {

             return this.MikroWizardRPC.sendJsonRequest("/api/user/edit", data);
    }

    create_user(data:any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/user/create", data);
    }
    delete_user(id:number){
        var data={
            'uid':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/delete", data);
    }
    check_firmware(devids:any) {
        var data = {
            'devids':devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/check_firmware_update", data);
    }

    get_firms(page:Number,size:Number,search:any) {
        var data = {
            'page':page,
            'size':size,
            'search':search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/get_firms", data);
    }

    get_backups(data:any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/list", data);
    }
   
    get_backup(id:number){
        var data = {
            'id':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/get", data);
    }
    restore_backup(id:number){
        var data = {
            'backupid':id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/restore", data);
    }

    get_downloadable_firms() {
       
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/get_downloadable_firms", {});
    }

    download_firmware_to_repository(version:string){
        var data = {
            'version':version
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/download_firmware_to_repository", data);
    }

    save_firmware_setting(updatebehavior:string,firmwaretoinstall:string,firmwaretoinstallv6:string){
        var data = {
            'updatebehavior':updatebehavior,
            'firmwaretoinstall':firmwaretoinstall,
            'firmwaretoinstallv6':firmwaretoinstallv6
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/update_firmware_settings", data);
    }

    update_firmware(devids:string){
        var data = {
            'devids':devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/update_firmware", data);
    }

    upgrade_firmware(devids:string){
        var data = {
            'devids':devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/upgrade_firmware", data);   
    }

    reboot_devices(devids:string){
        var data = {
            'devids':devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/reboot_devices", data);   
    }

    get_settings(){
        return this.MikroWizardRPC.sendJsonRequest("/api/sysconfig/get_all", {});
    }

    save_sys_setting(data:any){
        return this.MikroWizardRPC.sendJsonRequest("/api/sysconfig/save_all", data);
    }
 

    ////
    //// End api funcs
    ////
    setupSession(context: any, session: any) {
        this.MikroWizardRPC.clearCookeis();
        this.MikroWizardRPC.setNewSession(context, session);
    }
 
    checkSessionExpired(error: any) {
        console.log(error);
        if ('title' in error && error.title == "session_expired")
            this.logout();
        return Promise.reject(error.message || error);
    }


    setSession(context: any, session_id: any) {
        this.MikroWizardRPC.setNewSession(context, session_id);
    }

    getSessionInfo() {
        return this.MikroWizardRPC.getSessionInfo();
    }

    getFullUrl(url: any) {
        return this.serverUrl + url;
    }
}
