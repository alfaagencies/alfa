var vrules={
	login:
	{
		email:'required',
		password:'required'
	},
	forgot_password:
	{
		email:'required'
	},
	change_password:
	{
		password:'required',
		new_password:'required|min:6',
		confirm_password:'required|same:new_password'	
	}
};
module.exports=vrules;