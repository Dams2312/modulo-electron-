export {};
declare global{
    interface Window{
        g3ops:{
            getState:()=>Promise<any>;
            closeToast:()=>void;
            openDetail:()=>void;
            openAction:(url:string)=>void;
            ack:(id:string)=>void;
            onDetail:(cb:(n:any)=>void)=>void;
            onToast: (
                callback: (notification: any) => void
            ) => void;
            getDetail:()=>Promise<any>;
            closeDetail:()=>void;
        }
    }
}