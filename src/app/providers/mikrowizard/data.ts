
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
    get_front_version() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/frontver/");
    }
    change_password(oldpass: string, newpass: string) {
        var data = {
            'oldpass': oldpass,
            'newpass': newpass
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/change_password", data);
    }
    dashboard_stats(versioncheck: boolean, front_version: string) {
        var data = {
            'versioncheck': versioncheck,
            'front_version': front_version
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dashboard/stats", data);
    }
    monitoring_devices_events(page: number, textfilter: string = '') {
        var data = {
            'page': page,
            'textfilter': textfilter
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/devs/get", data);
    }

    monitoring_events_fix(event_id: number) {
        var data = {
            'event_id': event_id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/events/fix", data);
    }

    monitoring_all_events(devid: number, page: number) {
        var data = {
            'devid': devid,
            'page': page
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/events/get", data);
    }
    monitoring_unfixed_events(devid: number) {
        var data = {
            'devid': devid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/monitoring/eventunfixed/get", data);
    }
    dashboard_traffic(delta: string) {
        var data = {
            'delta': delta
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dashboard/traffic", data);
    }

    get_dev_list(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/list", data);
    }

    get_devgroup_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/list", {});
    }

    get_devgroup_members(gid: number) {
        var data = {
            'gid': gid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/members", data);
    }
    delete_group(id: number) {
        var data = {
            'gid': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/delete", data);
    }

    delete_devices(devids: any) {
        var data = {
            'devids': devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/delete", data);
    }

    get_dev_info(id: number) {
        var data = {
            'devid': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/info", data);
    }

    get_editform(id: number) {
        let data = { devid: id };
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/get_editform", data);
    }
    save_editform(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/save_editform", data);
    }
    get_editform_pro(id: number) {
        let data = { devid: id };
        return this.MikroWizardRPC.sendJsonRequest("/api/pro/dev/get_editform", data);
    }
    save_editform_pro(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pro/dev/save_editform", data);
    }
    get_dev_sensors(id: number, delta: string = "5m", total_type: string = "bps") {
        var data = {
            'devid': id,
            'delta': delta,
            'total': total_type
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/sensors", data);
    }
    get_dev_radio_sensors(id: number, delta: string = "5m") {
        var data = {
            'devid': id,
            'delta': delta
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/radio/sensors", data);
    }
    get_dev_dhcp_info(id: number) {
        var data = {
            'devid': id,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/dhcp-server/get", data);
    }
    get_dev_ifstat(id: number, delta: string = "5m", iface: string = "ether1", type: string = "bps") {
        var data = {
            'devid': id,
            'delta': delta,
            'type': type,
            'interface': iface
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/ifstat", data);
    }
    totp(action: string, userid: string) {
        var data = {
            'userid': userid,
            'action': action
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/totp", data);
    }

    get_user_restrictions(uid: string) {
        var data = {
            'uid': uid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/restrictions", data);
    }
    save_user_restrictions(uid: string, restrictions: any) {
        var data = {
            'uid': uid,
            'restrictions': restrictions
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/save_restrictions", data);
    }

    mytotp(action: string, otp: any = false) {
        var data = {
            'action': action,
            'otp': otp
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/mytotp", data);
    }

    get_auth_logs(filters: any) {
        var data = filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/auth/list", data);
    }

    getWebfigRecordingStreamUrl(sessionId: string) {
        return "/api/proxy/recording/stream/" + sessionId;
    }

    getWebfigLiveStreamUrl(sessionId: string) {
        return "/api/proxy/recording/live/" + sessionId;
    }

    shareWebfigSession(sessionId: string, role: string, name: string, shareType: string, targetUserId: string, password: string, oneTime: boolean, hostApproval: boolean) {
        var data = {
            session_id: sessionId,
            role: role,
            name: name,
            share_type: shareType,
            target_user_id: targetUserId,
            password: password,
            one_time: oneTime,
            host_approval: hostApproval
        };
        return this.MikroWizardRPC.sendJsonRequest("/api/proxy/session/share", data);
    }

    joinWebfigSession(token: string, password?: string, guestName?: string) {
        var data = {
            token: token,
            password: password || '',
            guest_name: guestName || ''
        };
        return this.MikroWizardRPC.sendJsonRequest("/api/proxy/session/join", data);
    }

    getWebfigParticipants(sessionId: string) {
        var data = { session_id: sessionId };
        return this.MikroWizardRPC.sendJsonRequest("/api/proxy/session/participants", data);
    }

    get_account_logs(filters: any) {
        var data = filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/account/list", data);
    }

    get_dev_logs(filters: any) {
        var data = filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/devlogs/list", data);
    }

    get_syslog(filters: any) {
        var data = filters;
        return this.MikroWizardRPC.sendJsonRequest("/api/syslog/list", data);
    }
    get_details_grouped(devid: number = 0) {
        var data = {
            'devid': devid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devlogs/details/list", data);
    }

    scan_devs(type: string, info: any) {
        var data: any = {
            'type': type
        }
        if (type == "ip") {
            data = Object.assign(data, info);
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/scanner/scan", data);
    }

    scan_results() {
        return this.MikroWizardRPC.sendJsonRequest("/api/scanner/results", {});
    }

    get_groups(searchstr: string = "") {
        var data = {
            'searchstr': searchstr
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/search/groups", data);
    }

    get_devices(searchstr: string = "") {
        var data = {
            'searchstr': searchstr
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/search/devices", data);
    }

    update_save_group(group: any) {
        var data = {
            ...group
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/update_save_group", data);
    }

    get_snippets(name: string, desc: string, content: string, page: number = 0, size: number = 1000, limit: any = false) {
        var data = {
            'name': name,
            'description': desc,
            'content': content,
            'page': page,
            'size': size,
            'limit': limit
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/list", data);
    }

    save_snippet(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/save", { ...data });
    }

    Exec_snipet(data: any, members: any) {
        data['members'] = members;
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/exec", data);
    }

    delete_snippet(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/delete", data);
    }

    get_executed_snipet(id: number, limit: number = 1000) {
        var data = {
            'id': id,
            'limit': limit
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/executed", data);
    }

    get_sequences() {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/list", {});
    }

    save_sequence(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/save", { ...data });
    }

    delete_sequence(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/delete", data);
    }

    get_sequence_history(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/history", data);
    }

    exec_sequence(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/exec", data);
    }

    get_syslog_regexes() {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/syslogregex/list", {});
    }

    save_syslog_regex(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/syslogregex/save", { ...data });
    }

    delete_syslog_regex(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/syslogregex/delete", data);
    }

    get_syslogregex_samples() {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/syslogregex/samples", {});
    }

    get_alerts() {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/alert/list", {});
    }

    save_alert(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/alert/save", { ...data });
    }

    delete_alert(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/alert/delete", data);
    }

    get_user_task_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/list", {});
    }

    Add_task(data: any, members: any) {
        data['members'] = members;
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/create", data);
    }

    Delete_task(taskid: Number) {
        var data = {
            'taskid': taskid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/delete", data);
    }

    Edit_task(data: any, members: any) {
        data['members'] = members;
        return this.MikroWizardRPC.sendJsonRequest("/api/user_tasks/edit", data);
    }

    get_task_members(taskid: Number) {
        var data = {
            'taskid': taskid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/taskmember/details", data);
    }

    get_users(page: Number, size: Number, search: string) {
        var data = {
            'page': page,
            'size': size,
            'search': search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/users/list", data);
    }

    get_perms(page: Number, size: Number, search: string) {
        var data = {
            'page': page,
            'size': size,
            'search': search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/list", data);
    }

    create_perm(name: string, perms: any) {
        var data = {
            'name': name,
            'perms': perms
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/create", data);
    }

    edit_perm(id: Number, name: string, perms: any) {

        var data = {
            'id': id,
            'name': name,
            'perms': perms
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/perms/edit", data);
    }

    delete_perm(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/perms/delete", data);
    }

    get_vault_setting() {
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/get", {});
    }

    vault_task(data: any) {

        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/task", data);
    }
    vault_history() {
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/history", {});
    }
    exec_vault() {
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/execute", {});
    }
    reveal_password(devid: number, username: string) {
        var data = {
            'devid': devid,
            'username': username
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/reveal", data);
    }

    get_passwords(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/get_passwords", data);
    }
    get_device_pass(devid: number) {
        var data = {
            'devid': devid
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/pssvault/get_device_pass", data);
    }
    user_perms(uid: string) {

        var data = {
            'uid': uid,
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/list", data);
    }

    Add_user_perm(uid: Number, permid: Number, devgroupid: Number) {

        var data = {
            'uid': uid,
            'pid': permid,
            'gid': devgroupid
        }

        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/create", data);
    }
    Delete_user_perm(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/userperms/delete", data);
    }
    edit_user(data: any) {

        return this.MikroWizardRPC.sendJsonRequest("/api/user/edit", data);
    }

    create_user(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/user/create", data);
    }
    delete_user(id: number) {
        var data = {
            'uid': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/user/delete", data);
    }
    check_firmware(devids: any) {
        var data = {
            'devids': devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/check_firmware_update", data);
    }

    get_firms(page: Number, size: Number, search: any) {
        var data = {
            'page': page,
            'size': size,
            'search': search
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/get_firms", data);
    }

    delete_firm(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/delete_from_repository", data);
    }

    get_backups(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/list", data);
    }

    get_backup(id: number) {
        var data = {
            'id': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/get", data);
    }
    restore_backup(id: number) {
        var data = {
            'backupid': id
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/backup/restore", data);
    }

    get_downloadable_firms() {

        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/get_downloadable_firms", {});
    }

    download_firmware_to_repository(version: string) {
        var data = {
            'version': version
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/download_firmware_to_repository", data);
    }

    save_firmware_setting(updatebehavior: string, firmwaretoinstall: string, firmwaretoinstallv6: string) {
        var data = {
            'updatebehavior': updatebehavior,
            'firmwaretoinstall': firmwaretoinstall,
            'firmwaretoinstallv6': firmwaretoinstallv6
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/update_firmware_settings", data);
    }

    update_firmware(devids: string) {
        var data = {
            'devids': devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/update_firmware", data);
    }

    upgrade_firmware(devids: string) {
        var data = {
            'devids': devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/upgrade_firmware", data);
    }

    reboot_devices(devids: string) {
        var data = {
            'devids': devids
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/firmware/reboot_devices", data);
    }

    get_settings() {
        return this.MikroWizardRPC.sendJsonRequest("/api/sysconfig/get_all", {});
    }

    save_sys_setting(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/sysconfig/save_all", data);
    }

    get_running_tasks() {
        return this.MikroWizardRPC.sendJsonRequest("/api/tasks/list", {});
    }
    stop_task(signal: number) {
        var data = {
            'signal': signal
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/tasks/stop", data);
    }
    apply_update(action: string) {
        var data = {
            'action': action
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/sysconfig/apply_update", data);
    }


    get_cloner_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/cloner/list", {});
    }

    Add_cloner(data: any, members: any) {
        data['members'] = members;
        return this.MikroWizardRPC.sendJsonRequest("/api/cloner/create", data);
    }

    Delete_cloner(clonerid: number) {
        var data = {
            'clonerid': clonerid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/cloner/delete", data);
    }

    Edit_cloner(data: any, members: any) {
        data['members'] = members;
        return this.MikroWizardRPC.sendJsonRequest("/api/cloner/edit", data);
    }

    get_cloner_members(clonerid: number) {
        var data = {
            'clonerid': clonerid,
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/cloner/memberdetails", data);
    }
    killSession(devid: number, item: any) {
        var data = {
            'devid': devid,
            'item': item
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/kill_session", data);
    }
    getDhcpHistory(item: any) {
        var data = {
            'item': item
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dhcp-history/get", data);
    }

    getNetworkMap() {
        return this.MikroWizardRPC.sendJsonRequest("/api/networkmap/get", {});
    }

    resetNetworkMap() {
        return this.MikroWizardRPC.sendJsonRequest("/api/networkmap/reset", {});
    }

    bulk_add_devices(devices: any[]) {
        var data = {
            'devices': devices
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/bulk_add", data);
    }

    bulk_add_status(taskId: string) {
        var data = {
            'taskId': taskId
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/bulk_add_status", data);
    }

    group_firmware_action(groupId: number, action: string) {
        var data = {
            'groupId': groupId,
            'action': action
        }
        return this.MikroWizardRPC.sendJsonRequest("/api/devgroup/firmware_action", data);
    }

    // Customer Portal & Activation & Reset password
    customerRegister(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/register_pro", data);
    }
    customerActivate(token: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/activate_pro", { token });
    }
    customerForgotPassword(email: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/forgot_password_pro", { email });
    }
    customerResetPassword(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/reset_password_pro", data);
    }
    customerGetDiagnostics(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/diagnostics`);
    }
    customerRunTraceroute(devid: number, target: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/traceroute`, { target });
    }
    customerGetInterfaceSources(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/interface-sources`);
    }
    customerGetPortforwards(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/portforwards`);
    }
    customerAddPortforward(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/portforwards/add`, payload);
    }
    customerDeletePortforward(devid: number, rule_id: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/portforwards/delete`, { rule_id });
    }
    customerTogglePortforward(devid: number, rule_id: string, disabled: boolean) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/portforwards/toggle`, { rule_id, disabled });
    }
    customerMovePortforward(devid: number, rule_id: string, destination: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/portforwards/move`, { rule_id, destination });
    }
    customerGetAddressLists(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/address-lists`);
    }
    customerAddAddressList(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/address-lists/add`, payload);
    }
    customerDeleteAddressList(devid: number, rule_id: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/address-lists/delete`, { rule_id });
    }
    customerToggleAddressList(devid: number, rule_id: string, disabled: boolean) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/address-lists/toggle`, { rule_id, disabled });
    }
    customerGetFirewallRules(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/firewall/list`);
    }
    customerGetFirewallPresetStatus(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/firewall/preset/status`);
    }
    customerEnableFirewallPreset(devid: number, preset_key: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/preset/enable`, { preset_key });
    }
    customerDisableFirewallPreset(devid: number, preset_key: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/preset/disable`, { preset_key });
    }
    customerAddFirewallCustom(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/custom/add`, payload);
    }
    customerDeleteFirewallCustom(devid: number, rule_id: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/custom/delete`, { rule_id });
    }
    customerToggleFirewallCustom(devid: number, rule_id: string, disabled: boolean) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/custom/toggle`, { rule_id, disabled });
    }
    customerMoveFirewallRule(devid: number, rule_id: string, destination_id: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/firewall/rule/move`, { rule_id, destination_id });
    }
    customerGetSpeedtestHistory(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/speedtest/history?devid=${devid}`);
    }
    customerSaveSpeedtest(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/speedtest/save", payload);
    }
    customerRunRouterSpeedtest(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/router-speedtest`, payload);
    }
    customerGetDevices() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/customer/devices");
    }
    customerGetAuthLogs(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/logs/auth", payload);
    }
    customerGetAccountingLogs(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/logs/accounting", payload);
    }
    customerGetDeviceLogs(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/logs/device", payload);
    }
    customerGetConnectedClients(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/customer/connected-clients?devid=" + devid);
    }

    customerTerminalGetFavorites() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/terminal/favorites");
    }

    customerTerminalSaveFavorites(device_ids: number[]) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/favorites", { favorites: device_ids });
    }

    terminalGetFavorites() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/terminal/favorites");
    }

    terminalSaveFavorites(device_ids: number[]) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/favorites", { favorites: device_ids });
    }


    customerGetTickets() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/customer/tickets");
    }
    customerCreateTicket(title: string, description: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/tickets", { title, description });
    }
    customerGetTicketReplies(ticketId: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/tickets/${ticketId}/replies`);
    }
    customerReplyTicket(ticketId: number, message: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/tickets/${ticketId}/replies`, { message });
    }
    customerChat(history: any[], devid?: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/chat", { history, devid });
    }
    customerGetDeviceStatus(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/status`);
    }
    customerGetWifiInterfaces(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/devices/${devid}/wifi-interfaces`);
    }
    customerUpdateWifi(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/wifi/update`, payload);
    }
    customerPingDevice(devid: number, target: string, count: number) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/ping`, { target, count });
    }

    pingDevice(devid: number, target: string = "", count: number = 4) {
        return this.MikroWizardRPC.sendJsonRequest("/api/dev/ping", { devid, host: target, count });
    }
    customerRebootDevice(devid: number) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/devices/${devid}/reboot`, {});
    }

    customerGetChatSessions(devid?: number) {
        let url = "/api/customer/chat/sessions";
        if (devid) {
            url += "?devid=" + devid;
        }
        return this.MikroWizardRPC.sendHttpGetRequest(url);
    }
    customerCreateChatSession(devid?: number, title?: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/customer/chat/sessions", { devid, title });
    }
    customerGetChatSession(sid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/customer/chat/sessions/${sid}`);
    }
    customerRenameChatSession(sid: number, title: string) {
        return this.MikroWizardRPC.sendHttpPutRequest(`/api/customer/chat/sessions/${sid}`, { title });
    }
    customerDeleteChatSession(sid: number) {
        return this.MikroWizardRPC.sendHttpDeleteRequest(`/api/customer/chat/sessions/${sid}`);
    }
    customerSendChatMessage(sid: number, message: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/customer/chat/sessions/${sid}/message`, { message });
    }

    // Admin Ticketing & Assignments & AI Chat Sessions
    adminGetChatSessions(devid?: number) {
        let url = "/api/admin/chat/sessions";
        if (devid) {
            url += `?devid=${devid}`;
        }
        return this.MikroWizardRPC.sendHttpGetRequest(url);
    }
    adminGetChatSession(sid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/admin/chat/sessions/${sid}`);
    }
    adminGetSelfChatSessions(devid?: number) {
        let url = "/api/admin/chat/self-sessions";
        if (devid) {
            url += `?devid=${devid}`;
        }
        return this.MikroWizardRPC.sendHttpGetRequest(url);
    }
    adminCreateSelfChatSession(devid?: number, title?: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/admin/chat/self-sessions", { devid, title });
    }
    adminGetSelfChatSession(sid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/admin/chat/self-sessions/${sid}`);
    }
    adminRenameSelfChatSession(sid: number, title: string) {
        return this.MikroWizardRPC.sendHttpPutRequest(`/api/admin/chat/self-sessions/${sid}`, { title });
    }
    adminDeleteSelfChatSession(sid: number) {
        return this.MikroWizardRPC.sendHttpDeleteRequest(`/api/admin/chat/self-sessions/${sid}`);
    }
    adminSendSelfChatMessage(sid: number, message: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/admin/chat/self-sessions/${sid}/message`, { message });
    }
    getOpenRouterModels() {
        return this.MikroWizardRPC.sendHttpGetRequest('/api/admin/ai/openrouter-models');
    }

    adminGetTickets() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/admin/tickets");
    }
    adminAssignTicket(ticketId: number, assignedAdminId: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/admin/tickets/${ticketId}/assign`, { assigned_admin_id: assignedAdminId });
    }
    adminUpdateTicketStatus(ticketId: number, status: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/admin/tickets/${ticketId}/status`, { status });
    }
    adminGetTicketReplies(ticketId: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/admin/tickets/${ticketId}/replies`);
    }
    adminReplyTicket(ticketId: number, message: string) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/admin/tickets/${ticketId}/replies`, { message });
    }
    adminAssignCustomer(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/admin/customer/assign_pro", data);
    }
    adminGetCustomerAssignments() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/admin/customer/assignments_pro");
    }
    adminUnassignCustomer(id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/admin/customer/unassign_pro", { id });
    }
    adminSendSmtpTest(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/admin/smtp_test_pro", payload);
    }

    getSpeedtestServers() {
        return this.MikroWizardRPC.sendHttpGetRequest("/api/customer/speedtest/servers");
    }

    adminGetSpeedtestHistory(devid: number) {
        return this.MikroWizardRPC.sendHttpGetRequest(`/api/admin/devices/${devid}/speedtest/history`);
    }

    adminRunRouterSpeedtest(devid: number, payload: any) {
        return this.MikroWizardRPC.sendJsonRequest(`/api/admin/devices/${devid}/router-speedtest`, payload);
    }

    adminSendChat(payload: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/admin/chat", payload);
    }

    ////
    //// Alert API endpoints
    ////
    alerts_options() {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/options", {});
    }
    alerts_services() {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/services", {});
    }
    alerts_settings_save(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/settings/save", data);
    }
    alerts_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/list", {});
    }
    alerts_save(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/save", data);
    }
    alerts_delete(id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/delete", { id });
    }
    alert_channels_list() {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/channels/list", {});
    }
    alert_channels_save(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/channels/save", data);
    }
    alert_channels_delete(id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/channels/delete", { id });
    }
    alerts_test(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/test", data);
    }
    alerts_history(limit: number = 200) {
        return this.MikroWizardRPC.sendJsonRequest("/api/alerts/history", { limit });
    }

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

    // ---- Session Management ----
    listSessions(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/sessions/list", data);
    }

    killTerminalSession(sessionId: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/sessions/kill", { session_id: sessionId });
    }

    sessionsByDevice(deviceId: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/sessions/by-device", { device_id: deviceId });
    }

    sessionsByUser(userId: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/sessions/by-user", { user_id: userId });
    }

    sessionParticipants(sessionId: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/sessions/participants", { session_id: sessionId });
    }

    shareSession(sessionId: string, role: string = 'observer', name: string = '', shareType: string = 'guest', targetUserId: string = '', password: string = '', oneTime: boolean = false, hostApproval: boolean = false) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/session/share", { 
            session_id: sessionId, 
            role: role, 
            name: name,
            share_type: shareType,
            target_user_id: targetUserId,
            password: password,
            one_time: oneTime,
            host_approval: hostApproval
        });
    }

    listRecordings(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/recording/list", data);
    }

    // ---- Non-MikroTik Device Management ----
    listNonMikrotikDevices() {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/list", {});
    }

    bulk_add_non_mikrotik_devices(devices: any[]) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/bulk_add", { devices: devices });
    }

    validate_non_mikrotik_bulk(devices: any[]) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/bulk/validate", { devices: devices });
    }

    getNonMikrotikInfo(deviceId: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/info", { device_id: deviceId });
    }

    addNonMikrotikDevice(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/add", data);
    }

    editNonMikrotikDevice(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/edit", data);
    }

    deleteNonMikrotikDevice(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/devices/delete", data);
    }

    attachDeviceToGroups(deviceId: number, groupIds: number[]) {
        return this.MikroWizardRPC.sendJsonRequest("/api/non-mikrotik/groups/attach", { device_id: deviceId, group_ids: groupIds });
    }

    // ---- PAM / Template Management ----
    listBrands() {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/brands/list", {});
    }

    listTemplates(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/templates/list", data);
    }

    getTemplate(templateId: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/templates/get", { template_id: templateId });
    }

    createTemplate(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/templates/create", data);
    }

    updateTemplate(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/templates/update", data);
    }

    deleteTemplate(templateId: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/templates/delete", { id: templateId });
    }

    // ---- Brand CRUD ----
    createBrand(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/brands/create", data);
    }

    updateBrand(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/brands/update", data);
    }

    deleteBrand(brand: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/brands/delete", { brand });
    }

    // ---- Credentials ----
    listCredentials(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/credentials/list", data);
    }

    // ---- Terminal Command Logs ----
    terminalLogSearch(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/logs/search", data);
    }

    getDeviceAgentConfig(deviceId: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/device/agent-config", {
            device_id: deviceId
        });
    }

    setDeviceAgentConfig(deviceId: number, agentModes: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/terminal/device/agent-config", {
            device_id: deviceId,
            agent_modes: agentModes
        });
    }

    // ---- Terminal Policies ----
    listPolicies() {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/list", {});
    }

    getPolicy(id: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/info", { id });
    }

    createPolicy(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/create", data);
    }

    updatePolicy(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/update", data);
    }

    deletePolicy(id: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/delete", { id });
    }

    getDeviceBrands() {
        return this.MikroWizardRPC.sendJsonRequest("/api/pam/brands/list", {});
    }

    // ---- Policy Grants ----
    listPolicyGrants(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/grant/list", data);
    }

    createPolicyGrant(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/grant/create", data);
    }

    deletePolicyGrant(data: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/policy/grant/delete", data);
    }

    // ---- Config Versions (FREE) ----
    get_config_versions(params: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/list", params);
    }

    get_config_version(id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/get", { id });
    }

    get_latest_config_version(device_id: number, command_key: string = 'show_config') {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/latest", { device_id, command_key });
    }

    get_raw_config(id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/raw", { version_id: id });
    }

    // ---- Executions (FREE) ----
    get_executions(params: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/executions/list", params);
    }

    run_execution(params: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/executions/run", params);
    }

    get_execution_status(execution_run_id: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/executions/status", { execution_run_id });
    }

    export_executions_csv(execution_run_id: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/executions/export", { execution_run_id });
    }

    // ---- Config Versions (PRO) ----
    diff_config_versions(version_id_a: number, version_id_b: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/diff", { version_id_a, version_id_b });
    }

    search_config_versions(params: any) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/search", params);
    }

    preview_diff_exclusions(template_id: number, sample_text: string) {
        return this.MikroWizardRPC.sendJsonRequest("/api/config-versions/diff-exclusions/preview", { template_id, sample_text });
    }

    // ---- Sequence History Export (PRO) ----
    export_sequence_history(seq_id: number) {
        return this.MikroWizardRPC.sendJsonRequest("/api/snippet/sequence/history/export", { id: seq_id });
    }
}
