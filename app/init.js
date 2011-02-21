$(function(){
	var $body = $('body');

	var participants = (function(){
		var list = [];
		var el = $('#participants');

		var api = {
			'autocomplete': function(el){
				el = el || $('.participant:input');
				el.unautocomplete().autocomplete(list, {
					autoFill: true,
					multiple: true,
					multipleSeparator: ", ",
				});
			},
			'get': function(){ return list.clean('') },
			'len': function() { return list.length },
			'random': function(){ return (list.length == 0) ? null : list[Math.floor(Math.random()*list.length)] },
		}

		$body.delegate('.participant', 'blur', function(){
			// Gather the people
			var templist = []
			$('.participant').each(function(){
				templist.push.apply(templist, $(this).val().trim().split(new RegExp('\\s*[,\n]\\s*')));
			});

			// Eliminate the duplicates
			var len = templist.length;
			var tempobj = {};
			for (var i=0; i < len; ++i)	tempobj[templist[i]] = 0;

			// Put the results
			list = []
			for (i in tempobj) list.push(i);
			api.autocomplete();
		});

		$body.delegate('textarea', 'blur', function(e){
			payday.update();
		});

		return api
	})();

	var expenses = (function(){
		var list = $('#expenses');
		var empty = list.children('.new');

		var preparePersonPlaceholder = function(buyer){
			var people = participants.get();
			if (people.length)
			{
				if (Math.random() > 0.7 && participants.len() > 1)
				{
					var one = participants.random();
					var second = one;
					while (second == one)
						second = participants.random();
					result = one + ', ' + second;
				} else
					result = participants.random();
				buyer.attr('placeholder', result);
			}
		}

		var append = function() {
			var row = empty.clone().appendTo(list).removeClass('new');
			var buyer = row.find('.buyer');
			preparePersonPlaceholder(buyer);
			participants.autocomplete(buyer);
			return row
		}
		var focus = function(row) { return row.find('input').eq(0).focus() }

		var api = {
			'append': function(){ focus(append()) },
			'get': function(){
				var result = [];
				list.find('li:not(.new)').each(function(){
					var me = $(this);
					var t = {
						'buyers': me.find('.buyer').val().trim().split(new RegExp('\\s*[,\n]\\s*')).clean(''),
						'price': parseFloat(me.find('.price').val(), 10)
					}
					if (t.buyers && t.price)
						result.push(t);
				});
				return result;
			},
		}

		append();
		list.delegate('.price', 'blur', function(e){
			var dad = $(this).parents('li');
			var us = dad.find('input');
			if (dad.is(':last-child') && us.filter('[value=""]').length != us.length)
				focus(append());
		});
		setTimeout(function(){
			list.delegate('input', 'blur', payday.update);
		}, 100);
		return api;
	})();

	var payday = (function(){
		var el = $('#payday');
		var list = el.find('ul');

		var item = (function(){
			var add = function(el, name, amount){
				var amount = Math.round(amount * 100)/100
				el.clone().removeClass('new')
					.find('.person').text(name).end()
					.find('.amount').text(amount).end()
					.appendTo(list);
			}
			var templates = { 'owes': list.find('.new.owes'), 'owed': list.find('.new.owed'), 'balanced': list.find('.new.balanced') }

			return {
				'owes': function(name, amount){ add(templates['owes'], name, -amount); },
				'owed': function(name, amount){ add(templates['owed'], name, amount); },
				'balanced': function(name){ add(templates['balanced'], name, ''); }
			}
		})();


		var update_real = function(){
			list.children(':not(.new)').remove();
			var people = participants.get();

			var balanses = {};
			$.each(people, function(){
				balanses[this] = 0;
			})

			var sum = 0;
			$.each(expenses.get(), function(){
				if (this.buyers.length)
				{
					var share = this.price / this.buyers.length;
					$.each(this.buyers, function(){
						balanses[this] += share;
					});
					sum += this.price;
				}
			});
			var share = sum/participants.len();

			$.each(balanses, function(name){
				var balance = this - share;
				if (balance < 0)
					item.owes(name, balance);
				else if (balance > 0)
					item.owed(name, balance);
				else
					item.balanced(name);
			});
			el.removeClass('working');
		}
		var timer = null;
		var first = true;
		var update = function(){
			if (first) el.removeClass('inactive');
			el.addClass('working');
			clearTimeout(timer);
			timer = setTimeout(update_real, 1000);
		}
		api = {
			'update': update
		}
		return api;

		dbg = {
			'users': participants, 'exp': expenses, 'pay': payday
		}
	})();
});
